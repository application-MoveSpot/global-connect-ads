#!/usr/bin/env python3
"""
MoveSpot — Vérification des traductions manquantes
Scanne tous les fichiers source TypeScript/TSX et compare avec src/locales/fr.json.
Détecte :
  1. Les clés statiques  t("a.b.c")  absentes de fr.json
  2. Les clés dynamiques t(`prefix_${var}`) avec leurs valeurs connues absentes de fr.json
  3. Les chaînes anglaises codées en dur dans le JSX (heuristique)

Usage:
  python3 scripts/i18n-check.py            # vérification complète
  python3 scripts/i18n-check.py --fix      # ajoute les clés manquantes comme TODO
  python3 scripts/i18n-check.py --english  # affiche les chaînes potentiellement anglaises
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
FR_JSON = ROOT / "src" / "locales" / "fr.json"
SRC_DIR = ROOT / "src"

# ─── Patterns ─────────────────────────────────────────────────────────────────

# Clés statiques : t("a.b.c") ou t('a.b.c')
STATIC_KEY = re.compile(r"""(?<![a-zA-Z])t\(["']([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)["']""")

# Clés dynamiques : t(`prefix_${...}`) ou t(`prefix.${...}`)
DYNAMIC_KEY = re.compile(r"""t\(`([a-z][a-z0-9_.]*[_.])\$\{""")

# Mots anglais à détecter dans le JSX (entre > et <, ou dans title/placeholder/label)
ENGLISH_WORDS = re.compile(
    r"""\b(open|closed|pending|active|approved|rejected|cancelled|fulfilled|completed|
        suspended|withdrawn|scheduled|in_progress|refunded|paid|loading|
        submit|cancel|save|back|next|previous|confirm|delete|edit|add|
        new|create|update|search|filter|sort|view|show|hide|close|
        dashboard|settings|profile|account|logout|login|signup|
        overview|details|summary|history|analytics|reports|
        manage|upload|download|export|import|connect|disconnect|
        enable|disable|activate|deactivate|verify|validate|
        success|error|warning|info|notice|tip|badge|
        vehicle|driver|owner|provider|advertiser|partner|admin)\b""",
    re.VERBOSE | re.IGNORECASE,
)

# Valeurs connues pour les patterns dynamiques détectés automatiquement
KNOWN_DYNAMIC_VALUES: dict[str, list[str]] = {
    "advertiser.briefs.detail.status_": ["open", "closed", "fulfilled", "cancelled"],
    "advertiser.briefs.detail.proposal_": ["pending", "accepted", "rejected", "withdrawn"],
    "advertiser.briefs.detail.campaign_": ["pending", "approved", "active", "completed", "cancelled", "rejected"],
    "advertiser.briefs.detail.payment_": ["pending", "paid", "refunded"],
    "advertiser.briefs.detail.install_": ["pending", "scheduled", "in_progress", "completed", "approved", "rejected"],
    "advertiser.briefs_list.status_": ["open", "closed", "fulfilled", "cancelled"],
    "advertiser.remboursement.status_": ["pending", "approved", "rejected", "paid"],
    "campaign_status.": ["pending", "approved", "active", "completed", "cancelled", "rejected"],
    "commercial.dashboard.legal_status_": [
        "auto_entrepreneur", "sarl", "sas", "sasu", "eurl", "sa", "other",
    ],
    "commercial.dashboard.status_": ["pending", "approved", "active", "completed", "cancelled", "rejected"],
    "owner.historique.status_": ["pending", "approved", "active", "completed", "cancelled", "rejected"],
    "owner.vehicules.calendar.status_": ["pending", "confirmed", "active", "completed", "cancelled"],
    "provider.inscription.status_": ["pending", "approved", "rejected", "suspended"],
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def flatten(d: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for k, v in d.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys |= flatten(v, full)
        else:
            keys.add(full)
    return keys


def set_nested(d: dict, key: str, value: str) -> None:
    parts = key.split(".")
    for part in parts[:-1]:
        d = d.setdefault(part, {})
    d[parts[-1]] = value


def source_files() -> list[Path]:
    files = []
    for ext in ("*.tsx", "*.ts"):
        for p in SRC_DIR.rglob(ext):
            if ".gen." not in p.name and ".d.ts" not in p.name:
                files.append(p)
    return files


def extract_static_keys(files: list[Path]) -> set[str]:
    used: set[str] = set()
    ignore = ("@/", "data:", "http")
    for path in files:
        try:
            for m in STATIC_KEY.finditer(path.read_text(encoding="utf-8")):
                k = m.group(1)
                if not any(k.startswith(p) for p in ignore):
                    used.add(k)
        except Exception:
            pass
    return used


def extract_dynamic_keys(files: list[Path]) -> set[str]:
    """Génère les clés dynamiques à partir des patterns et valeurs connus."""
    found_prefixes: set[str] = set()
    for path in files:
        try:
            for m in DYNAMIC_KEY.finditer(path.read_text(encoding="utf-8")):
                found_prefixes.add(m.group(1))
        except Exception:
            pass

    keys: set[str] = set()
    for prefix, values in KNOWN_DYNAMIC_VALUES.items():
        if any(prefix.startswith(fp) or fp.startswith(prefix) for fp in found_prefixes) or prefix in found_prefixes:
            for v in values:
                keys.add(f"{prefix}{v}")
    return keys


def find_hardcoded_english(files: list[Path]) -> list[tuple[str, int, str]]:
    """Détecte les chaînes anglaises codées en dur dans le JSX."""
    results: list[tuple[str, int, str]] = []
    # Pattern: texte visible entre balises JSX ou dans les attributs title/label/placeholder
    jsx_text = re.compile(r"""(?:>|title="|label="|placeholder="|alt=")([^<>{}"'\n]{3,60})""")
    for path in files:
        try:
            content = path.read_text(encoding="utf-8")
            for i, line in enumerate(content.splitlines(), 1):
                for m in jsx_text.finditer(line):
                    text = m.group(1).strip()
                    if ENGLISH_WORDS.search(text):
                        # Exclude lines that already call t(
                        if "t(" not in line and "//  " not in line:
                            rel = path.relative_to(ROOT)
                            results.append((str(rel), i, text))
        except Exception:
            pass
    return results


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="MoveSpot i18n checker")
    parser.add_argument("--fix", action="store_true", help="Ajoute les clés manquantes avec valeur TODO")
    parser.add_argument("--english", action="store_true", help="Affiche les chaînes anglaises codées en dur")
    args = parser.parse_args()

    with open(FR_JSON, encoding="utf-8") as f:
        fr = json.load(f)

    fr_keys = flatten(fr)
    files = source_files()

    static_keys = extract_static_keys(files)
    dynamic_keys = extract_dynamic_keys(files)
    all_used = static_keys | dynamic_keys

    missing = sorted(all_used - fr_keys)

    print(f"Clés statiques utilisées   : {len(static_keys)}")
    print(f"Clés dynamiques générées   : {len(dynamic_keys)}")
    print(f"Clés présentes dans fr.json: {len(fr_keys)}")

    exit_code = 0

    if missing:
        print(f"\n❌  {len(missing)} clé(s) manquante(s) :\n")
        for key in missing:
            print(f"  - {key}")
        exit_code = 1
        if args.fix:
            for key in missing:
                set_nested(fr, key, f"TODO:{key}")
            with open(FR_JSON, "w", encoding="utf-8") as f:
                json.dump(fr, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print(f"\n🔧  {len(missing)} clé(s) injectée(s) dans fr.json avec TODO:<clé>.")
    else:
        print("✅  Aucune clé manquante.")

    if args.english:
        hits = find_hardcoded_english(files)
        if hits:
            print(f"\n⚠️   {len(hits)} chaîne(s) potentiellement anglaises codées en dur :\n")
            for path, line, text in hits[:50]:
                print(f"  {path}:{line}  →  {text}")
        else:
            print("\n✅  Aucune chaîne anglaise codée en dur détectée.")

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
