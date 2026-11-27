# LLM Council — Flux de travail interne

> Fonctionnalité : analyse multi-modèle d'un brief publicitaire en 3 étapes
> Route : `/advertiser/conseil-ia`
> Edge Function Supabase : `llm-council`

---

## Architecture

```
Navigateur (annonceur)
  │
  ├─[step 1]─► supabase.functions.invoke("llm-council", { step: 1, brief })
  │              └─► OpenRouter API
  │                    ├─ anthropic/claude-3.5-sonnet  → Expert A
  │                    ├─ openai/gpt-4o               → Expert B
  │                    └─ google/gemini-2.5-flash     → Expert C
  │
  ├─[step 2]─► supabase.functions.invoke("llm-council", { step: 2, opinions })
  │              └─► OpenRouter API (3 modèles en parallèle pour cross-review)
  │
  └─[step 3]─► supabase.functions.invoke("llm-council", { step: 3, opinions, reviews })
                 └─► OpenRouter API (claude-3.5-sonnet chairman)
                       └─► Log usage → llm_council_calls
```

## Protocole en 3 étapes

### Étape 1 — Premières opinions parallèles

Les 3 modèles reçoivent le même brief (après anonymisation PII) et produisent **indépendamment** :
- `analysis` : analyse critique (2-3 phrases)
- `strengths` : forces du brief (max 3)
- `weaknesses` : faiblesses (max 3)
- `compliance_flags` : risques légaux ARPP/loi Évin/DGCCRF
- `score` : note /10

Implémentation : `Promise.allSettled` → tolérant aux pannes (1 ou 2 modèles peuvent échouer).

### Étape 2 — Évaluation croisée anonyme

Les 3 mêmes modèles reçoivent **les 3 analyses anonymisées** (Expert A/B/C) et produisent :
- `ranked_best` : quelle analyse est la plus pertinente
- `key_insights` : convergences entre experts
- `blind_spots` : angles morts non couverts
- `divergence_points` : points de désaccord

### Étape 3 — Synthèse Chairman

`claude-3.5-sonnet` reçoit opinions + évaluations croisées et produit :
- `executive_summary` : 2 phrases pour l'annonceur
- `synthesis` : synthèse complète (3-4 phrases)
- `recommendations` : 4 actions actionnables
- `priority_actions` : matrice impact/effort

---

## Conformité RGPD & Sécurité

### Anonymisation PII (avant tout envoi à OpenRouter)

La fonction `sanitizePII()` supprime automatiquement :
- Adresses e-mail → `[EMAIL]`
- Téléphones français (+33, 06, 07…) → `[TEL]`
- Numéros SIRET/SIREN → `[SIRET]`
- Plaques d'immatriculation (AA-123-AA) → `[IMMAT]`
- IBAN français → `[IBAN]`

### Zéro rétention

Header `x-or-no-data: 1` sur chaque appel OpenRouter pour désactiver la rétention des données côté fournisseur.

### Clé API

`OPENROUTER_API_KEY` est un **secret Supabase** (`Deno.env.get()`). Elle n'est jamais exposée côté client, jamais dans une variable `VITE_*`.

---

## Rate Limiting

| Profil     | Limite     | Fenêtre |
|------------|------------|---------|
| Annonceur  | 5 sessions | 24 h    |
| Admin      | 20 sessions| 24 h    |

Vérification : table `public.llm_council_calls` (comptage des lignes dans les 24 h glissantes).

Chaque session complète (step 3) insère une ligne dans `llm_council_calls`.

---

## Résilience

- `Promise.allSettled` aux étapes 1 et 2 : si un modèle échoue, les autres continuent.
- Timeout 25 s par appel modèle (`AbortController`).
- Minimum : 1 opinion disponible pour passer à l'étape 2 ; le Chairman fonctionne même si les peer-reviews sont partielles.
- Fallback JSON : si un modèle renvoie du texte libre au lieu de JSON, `parseJSON()` tente d'extraire le premier objet JSON (bloc de code ou inline).

---

## Variables d'environnement

| Variable           | Où               | Usage                        |
|--------------------|------------------|------------------------------|
| `OPENROUTER_API_KEY` | Supabase secrets | Accès OpenRouter (toutes étapes) |

### Comment ajouter la clé dans Supabase

```bash
# Via CLI Supabase
supabase secrets set OPENROUTER_API_KEY=sk-or-...

# Ou via le dashboard Supabase
# Project → Edge Functions → Secrets → Add secret
```

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `supabase/functions/llm-council/index.ts` | Edge Function Deno (3 steps, PII, rate limit) |
| `src/components/advertiser/LLMCouncilPanel.tsx` | Composant React UI |
| `src/routes/advertiser.conseil-ia.tsx` | Route `/advertiser/conseil-ia` |
| `supabase/migrations/20261127030000_llm_council_rate_limit.sql` | Table `llm_council_calls` |
