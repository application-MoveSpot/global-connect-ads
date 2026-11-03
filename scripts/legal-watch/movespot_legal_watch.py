#!/usr/bin/env python3
"""
MoveSpot — Veille juridique automatisée
Surveille les flux RSS de Légifrance et EUR-Lex, filtre par pertinence
publicité/mobilité, analyse l'impact via Claude, notifie via webhook.

Usage:
  python movespot_legal_watch.py              # tourne en boucle
  python movespot_legal_watch.py --once       # une seule passe (CI/cron)
  python movespot_legal_watch.py --dry-run    # analyse sans notifier ni persister

Variables d'environnement requises:
  ANTHROPIC_API_KEY      Clé API Anthropic
  WEBHOOK_URL            URL Teams (*.webhook.office.com) ou Slack (hooks.slack.com)

Variables optionnelles:
  POLL_INTERVAL_S        Intervalle de polling en secondes (défaut: 3600)
  DB_PATH                Chemin SQLite (défaut: ./movespot_legal_watch.db)
  MIN_SCORE              Score minimum pour déclencher l'analyse IA (défaut: 2)
  LOG_LEVEL              DEBUG | INFO | WARNING (défaut: INFO)
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import os
import re
import sqlite3
import sys
import textwrap
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

import anthropic
import feedparser
import httpx

# ─── Configuration ────────────────────────────────────────────────────────────

RSS_SOURCES: list[dict] = [
    {
        "name": "Légifrance — Journal Officiel",
        "url": "https://www.legifrance.gouv.fr/feeds/jo.xml",
        "lang": "fr",
    },
    {
        "name": "Légifrance — Codes",
        "url": "https://www.legifrance.gouv.fr/feeds/codes.xml",
        "lang": "fr",
    },
    {
        "name": "EUR-Lex — Journal Officiel L",
        "url": "https://eur-lex.europa.eu/rss/rss-RSSLatestJOL.xml",
        "lang": "eu",
    },
    {
        "name": "EUR-Lex — Journal Officiel C",
        "url": "https://eur-lex.europa.eu/rss/rss-RSSLatestJOR.xml",
        "lang": "eu",
    },
]

# Groupes de mots-clés avec seuil minimum par groupe
KEYWORD_GROUPS: list[dict] = [
    {
        "name": "publicité",
        "weight": 3,
        "threshold": 1,
        "terms": [
            "publicité",
            "affichage publicitaire",
            "panneau publicitaire",
            "affichage mobile",
            "publicité extérieure",
            "out-of-home",
            "ooh",
            "dooh",
            "régie publicitaire",
            "enseigne",
            "annonce commerciale",
            "communication commerciale",
            "advertising",
            "display advertising",
        ],
    },
    {
        "name": "mobilité",
        "weight": 2,
        "threshold": 1,
        "terms": [
            "véhicule",
            "taxi",
            "vtc",
            "chauffeur",
            "transport à la demande",
            "tad",
            "covoiturage",
            "mobilité urbaine",
            "flotte",
            "circulation",
            "voiture de transport",
            "uber",
            "platform economy",
            "gig economy",
        ],
    },
    {
        "name": "numérique_données",
        "weight": 2,
        "threshold": 1,
        "terms": [
            "rgpd",
            "gdpr",
            "données personnelles",
            "traitement de données",
            "consentement",
            "dma",
            "digital markets act",
            "dsa",
            "digital services act",
            "ciblage publicitaire",
            "cookie",
            "tracking",
            "géolocalisation",
            "profilage",
            "intelligence artificielle",
            "ai act",
            "règlement ia",
        ],
    },
    {
        "name": "fiscal_environnement",
        "weight": 1,
        "threshold": 1,
        "terms": [
            "taxe locale sur la publicité extérieure",
            "tlpe",
            "zfe",
            "zone à faibles émissions",
            "crit'air",
            "vignette",
            "malus",
            "bonus écologique",
            "taxe carbone",
            "bilan carbone",
            "empreinte environnementale",
            "publicité écologique",
            "greenwashing",
            "pratiques trompeuses",
        ],
    },
]

MIN_SCORE_DEFAULT = 2
POLL_INTERVAL_DEFAULT = 3600
DB_PATH_DEFAULT = "./movespot_legal_watch.db"

CLAUDE_MODEL = "claude-opus-5-5"

SYSTEM_PROMPT = """\
Tu es un expert en droit de la publicité et de la mobilité urbaine en France et dans l'Union Européenne.
Tu conseilles MoveSpot, une plateforme de publicité mobile sur véhicules (taxi, VTC, camionnettes).
Tu analyses les nouvelles dispositions législatives ou réglementaires pour évaluer leur impact concret
sur le business model de MoveSpot et recommander des actions préventives."""

ANALYSIS_PROMPT_TEMPLATE = """\
Analyse ce nouveau texte juridique et évalue son impact sur MoveSpot.

=== TEXTE ===
Titre: {title}
Source: {source}
Date: {pub_date}
Résumé: {summary}
Lien: {link}

=== CONTEXTE MOVESPOT ===
MoveSpot est une marketplace B2B qui :
1. Met en relation annonceurs et propriétaires de flottes de véhicules
2. Gère la pose d'affiches publicitaires sur les véhicules (taxi, VTC, camionnettes)
3. Suit les campagnes GPS en temps réel (route parcourue, impressions estimées)
4. Verse des revenus aux propriétaires/chauffeurs en contrepartie du support publicitaire
5. Opère principalement en France, avec expansion EU

=== MISSION ===
Fournis une analyse structurée avec :
1. **Pertinence** (0-10) : est-ce directement applicable à MoveSpot ?
2. **Impacts identifiés** : liste concrète des contraintes ou opportunités
3. **Délai de conformité** : quand faut-il agir ?
4. **Actions recommandées** : mesures techniques, juridiques ou commerciales à prendre
5. **Risque si inaction** : sanction potentielle, amende, suspension d'activité ?

Sois direct et pratique. Si le texte n'est pas pertinent pour MoveSpot, dis-le clairement."""


# ─── Types ────────────────────────────────────────────────────────────────────

@dataclass
class Article:
    uid: str
    title: str
    link: str
    summary: str
    pub_date: str
    source_name: str
    score: int
    matched_groups: list[str]


@dataclass
class AnalysisResult:
    article: Article
    analysis_text: str
    thinking_text: str
    relevance_score: int  # 0-10 extrait du texte de l'IA
    error: str | None = None


# ─── Database ─────────────────────────────────────────────────────────────────

def init_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS seen_articles (
            uid         TEXT PRIMARY KEY,
            title       TEXT NOT NULL,
            link        TEXT NOT NULL,
            source      TEXT NOT NULL,
            score       INTEGER NOT NULL,
            seen_at     TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS impact_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            article_uid     TEXT NOT NULL REFERENCES seen_articles(uid),
            relevance_score INTEGER,
            analysis_text   TEXT NOT NULL,
            notified        INTEGER NOT NULL DEFAULT 0,
            analyzed_at     TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    return conn


def is_seen(conn: sqlite3.Connection, uid: str) -> bool:
    row = conn.execute("SELECT 1 FROM seen_articles WHERE uid = ?", (uid,)).fetchone()
    return row is not None


def mark_seen(conn: sqlite3.Connection, article: Article) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO seen_articles (uid, title, link, source, score) VALUES (?,?,?,?,?)",
        (article.uid, article.title, article.link, article.source_name, article.score),
    )
    conn.commit()


def log_impact(conn: sqlite3.Connection, result: AnalysisResult, notified: bool) -> None:
    conn.execute(
        "INSERT INTO impact_log (article_uid, relevance_score, analysis_text, notified) VALUES (?,?,?,?)",
        (result.article.uid, result.relevance_score, result.analysis_text, int(notified)),
    )
    conn.commit()


# ─── Keyword scoring ──────────────────────────────────────────────────────────

def compute_score(title: str, summary: str) -> tuple[int, list[str]]:
    """Retourne (score total, groupes touchés)."""
    text = (title + " " + summary).lower()
    total_score = 0
    matched_groups: list[str] = []

    for group in KEYWORD_GROUPS:
        hits = sum(1 for term in group["terms"] if term in text)
        if hits >= group["threshold"]:
            total_score += hits * group["weight"]
            matched_groups.append(group["name"])

    return total_score, matched_groups


# ─── RSS fetching ─────────────────────────────────────────────────────────────

def _article_uid(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


async def fetch_feed(
    client: httpx.AsyncClient,
    source: dict,
) -> list[Article]:
    log = logging.getLogger("watch.rss")
    try:
        resp = await client.get(source["url"], timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("Erreur fetch %s : %s", source["name"], exc)
        return []

    feed = feedparser.parse(resp.text)
    articles: list[Article] = []

    for entry in feed.entries:
        title = entry.get("title", "")
        link = entry.get("link", "") or entry.get("id", "")
        summary = entry.get("summary", "") or entry.get("description", "")
        pub_date = entry.get("published", "") or entry.get("updated", "")

        if not link:
            continue

        score, groups = compute_score(title, summary)
        if score == 0:
            continue

        articles.append(
            Article(
                uid=_article_uid(link),
                title=title,
                link=link,
                summary=summary[:2000],
                pub_date=pub_date,
                source_name=source["name"],
                score=score,
                matched_groups=groups,
            )
        )

    log.info("%s → %d article(s) pertinents", source["name"], len(articles))
    return articles


async def fetch_all_feeds(sources: list[dict]) -> list[Article]:
    async with httpx.AsyncClient(
        headers={"User-Agent": "MoveSpot-LegalWatch/1.0"},
        follow_redirects=True,
    ) as client:
        tasks = [fetch_feed(client, s) for s in sources]
        results = await asyncio.gather(*tasks)

    all_articles: list[Article] = []
    for batch in results:
        all_articles.extend(batch)

    # Déduplique par uid (même article dans plusieurs feeds)
    seen: set[str] = set()
    unique: list[Article] = []
    for a in all_articles:
        if a.uid not in seen:
            seen.add(a.uid)
            unique.append(a)

    return sorted(unique, key=lambda a: a.score, reverse=True)


# ─── Claude analysis ──────────────────────────────────────────────────────────

async def analyze_with_claude(
    client: anthropic.AsyncAnthropic,
    article: Article,
) -> AnalysisResult:
    log = logging.getLogger("watch.claude")
    prompt = ANALYSIS_PROMPT_TEMPLATE.format(
        title=article.title,
        source=article.source_name,
        pub_date=article.pub_date,
        summary=article.summary or "(résumé non disponible)",
        link=article.link,
    )

    try:
        response = await client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as exc:
        log.error("Erreur Claude API pour %s : %s", article.uid, exc)
        return AnalysisResult(
            article=article,
            analysis_text="",
            thinking_text="",
            relevance_score=0,
            error=str(exc),
        )

    analysis_text = ""
    thinking_text = ""
    for block in response.content:
        if block.type == "thinking":
            thinking_text = block.thinking
        elif block.type == "text":
            analysis_text = block.text

    # Extraire la note de pertinence depuis le texte (cherche "Pertinence (0-10) : N")
    relevance_score = 0
    match = re.search(r"pertinence[^:]*:\s*(\d+)", analysis_text, re.IGNORECASE)
    if match:
        relevance_score = min(10, max(0, int(match.group(1))))

    log.info("Analyse OK pour '%s' — pertinence=%d/10", article.title[:60], relevance_score)
    return AnalysisResult(
        article=article,
        analysis_text=analysis_text,
        thinking_text=thinking_text,
        relevance_score=relevance_score,
    )


# ─── Webhook notification ─────────────────────────────────────────────────────

WebhookType = Literal["teams", "slack"]


def detect_webhook_type(url: str) -> WebhookType:
    if "webhook.office.com" in url or "outlook.office.com" in url:
        return "teams"
    return "slack"


def _teams_payload(result: AnalysisResult) -> dict:
    a = result.article
    short_analysis = textwrap.shorten(result.analysis_text, width=400, placeholder="…")
    groups_str = " · ".join(f"`{g}`" for g in a.matched_groups)

    return {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "themeColor": "FF4F00",
        "summary": f"[Veille Juridique MoveSpot] {a.title}",
        "sections": [
            {
                "activityTitle": f"📋 {a.title}",
                "activitySubtitle": f"{a.source_name} — {a.pub_date}",
                "activityText": f"**Score pertinence IA:** {result.relevance_score}/10 | **Score keywords:** {a.score} | Groupes: {groups_str}",
                "facts": [],
            },
            {
                "title": "Analyse d'impact",
                "text": short_analysis,
            },
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "Lire le texte officiel",
                "targets": [{"os": "default", "uri": a.link}],
            }
        ],
    }


def _slack_payload(result: AnalysisResult) -> dict:
    a = result.article
    short_analysis = textwrap.shorten(result.analysis_text, width=600, placeholder="…")
    groups_str = " · ".join(f"`{g}`" for g in a.matched_groups)
    relevance_bar = "█" * result.relevance_score + "░" * (10 - result.relevance_score)

    return {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📋 Veille Juridique MoveSpot", "emoji": True},
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*<{a.link}|{a.title}>*\n_{a.source_name}_ — {a.pub_date}",
                },
            },
            {"type": "divider"},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Pertinence IA:*\n{relevance_bar} {result.relevance_score}/10"},
                    {"type": "mrkdwn", "text": f"*Thèmes détectés:*\n{groups_str}"},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Analyse d'impact:*\n{short_analysis}"},
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "📄 Texte officiel", "emoji": True},
                        "url": a.link,
                        "style": "primary",
                    }
                ],
            },
        ]
    }


async def send_webhook(
    client: httpx.AsyncClient,
    webhook_url: str,
    result: AnalysisResult,
) -> bool:
    log = logging.getLogger("watch.webhook")
    wtype = detect_webhook_type(webhook_url)
    payload = _teams_payload(result) if wtype == "teams" else _slack_payload(result)

    try:
        resp = await client.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        log.info("Notification envoyée (%s) pour '%s'", wtype, result.article.title[:60])
        return True
    except Exception as exc:
        log.error("Erreur webhook pour %s : %s", result.article.uid, exc)
        return False


# ─── Main pipeline ────────────────────────────────────────────────────────────

async def run_once(
    *,
    conn: sqlite3.Connection,
    anthropic_client: anthropic.AsyncAnthropic,
    webhook_url: str | None,
    min_score: int,
    dry_run: bool,
) -> int:
    """Lance une passe de veille. Retourne le nombre d'articles traités."""
    log = logging.getLogger("watch")
    log.info("=== Début de passe — %s ===", datetime.now(timezone.utc).isoformat())

    articles = await fetch_all_feeds(RSS_SOURCES)
    log.info("%d article(s) pertinents sur tous les feeds", len(articles))

    new_articles = [a for a in articles if not is_seen(conn, a.uid)]
    log.info("%d article(s) nouveaux (non déjà traités)", len(new_articles))

    high_priority = [a for a in new_articles if a.score >= min_score]
    log.info("%d article(s) passent le seuil de score (%d)", len(high_priority), min_score)

    processed = 0

    async with httpx.AsyncClient(follow_redirects=True) as http_client:
        for article in high_priority:
            log.info("Analyse de : %s", article.title[:80])

            result = await analyze_with_claude(anthropic_client, article)

            if result.error:
                log.warning("Analyse échouée pour %s : %s", article.uid, result.error)
                if not dry_run:
                    mark_seen(conn, article)
                continue

            notified = False
            if webhook_url and result.relevance_score >= 3:
                if not dry_run:
                    notified = await send_webhook(http_client, webhook_url, result)
                else:
                    log.info("[DRY-RUN] Notification ignorée pour '%s'", article.title[:60])
            else:
                log.debug(
                    "Pas de notification (pertinence=%d, webhook=%s)",
                    result.relevance_score,
                    "configuré" if webhook_url else "absent",
                )

            if not dry_run:
                mark_seen(conn, article)
                log_impact(conn, result, notified)

            processed += 1

            # Respect des rate limits Claude
            if len(high_priority) > 1:
                await asyncio.sleep(1)

    log.info("=== Fin de passe — %d article(s) analysés ===", processed)
    return processed


async def main_loop(args: argparse.Namespace) -> None:
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    log = logging.getLogger("watch")

    # Validation env
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_api_key:
        log.error("ANTHROPIC_API_KEY manquant")
        sys.exit(1)

    webhook_url = os.getenv("WEBHOOK_URL") or None
    if not webhook_url:
        log.warning("WEBHOOK_URL non configuré — les notifications seront désactivées")

    min_score = int(os.getenv("MIN_SCORE", str(MIN_SCORE_DEFAULT)))
    poll_interval = int(os.getenv("POLL_INTERVAL_S", str(POLL_INTERVAL_DEFAULT)))
    db_path = os.getenv("DB_PATH", DB_PATH_DEFAULT)

    conn = init_db(db_path)
    anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)

    kwargs = dict(
        conn=conn,
        anthropic_client=anthropic_client,
        webhook_url=webhook_url,
        min_score=min_score,
        dry_run=args.dry_run,
    )

    if args.once or args.dry_run:
        await run_once(**kwargs)
        return

    log.info("Démarrage boucle de veille (intervalle=%ds)", poll_interval)
    while True:
        try:
            await run_once(**kwargs)
        except Exception as exc:
            log.exception("Erreur inattendue dans run_once : %s", exc)
        log.info("Prochain scan dans %d secondes…", poll_interval)
        await asyncio.sleep(poll_interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MoveSpot — Veille Juridique")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Effectue une seule passe puis quitte",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyse sans notifier ni persister en base",
    )
    asyncio.run(main_loop(parser.parse_args()))
