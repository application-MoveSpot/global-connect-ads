---
name: skill-creator
description: >
  Crée, structure et valide de nouvelles skills Claude Code pour le dépôt MoveSpot.
  Déclencheurs : "/skill-creator", "crée une skill", "installe une skill",
  "nouvelle skill", "ajoute une skill", "create a skill", "new skill".
---

# Skill : `skill-creator` — Création et Validation de Skills MoveSpot

Produit des fichiers `.claude/skills/<nom>/SKILL.md` conformes à l'architecture du dépôt,
testés sur des cas réels MoveSpot, et prêts à commiter.

---

## Déclenchement

`/skill-creator` ou dès qu'un message demande de créer, installer ou ajouter une skill.

---

## Architecture obligatoire d'un `SKILL.md`

```
---
name: <kebab-case>
description: >
  Une phrase (< 160 chars). Inclure les phrases exactes de déclenchement.
---

# Skill : `<nom>` — <titre court>

<Description : quoi, pour qui, quand utiliser.>

## Déclenchement

`/<nom>` ou liste des mots-clés / phrases qui l'activent.

## Règles [section principale]

<Règles impératives, tableaux, exemples Entrée/Sortie.>

## Cas limites

<Ce que la skill ne gère pas, refus, escalades.>

## Données officielles (si applicable)

<Chiffres immuables MoveSpot — copiés depuis la référence, jamais inventés.>

## Checklist avant livraison

- [ ] ...
```

**Contraintes de taille :** < 500 lignes. Pas de remplissage. Pas de sections vides.

---

## Protocole en 3 étapes (obligatoire)

### Étape 1 — Cadrage

Clarifier avant d'écrire une ligne :

| Question | Réponse attendue |
|---|---|
| **Nom** | kebab-case, < 30 chars |
| **Déclencheur exact** | Phrase(s) ou slash-command |
| **Format de sortie** | Fichier / texte / artefact / commande |
| **Audience** | Annonceur / propriétaire / poseur / admin / dev |
| **Garde-fous** | RGPD ? Paiement ? Données personnelles ? |

Si l'utilisateur n'a pas fourni ces informations → poser les 5 questions en une fois, pas une par une.

### Étape 2 — Rédaction

1. Créer `.claude/skills/<nom>/SKILL.md` avec l'en-tête YAML.
2. Corps : règles impératives en premier, exemples concrets MoveSpot, cas limites.
3. Sous-dossiers autorisés :
   - `scripts/` : scripts Python/bash réutilisables (ex : génération PDF, QR code).
   - `references/` : données statiques, palettes, tableaux tarifaires.
4. Pas de fichier supplémentaire si tout tient dans `SKILL.md`.

**Garde-fous MoveSpot — toujours vérifier :**

| Domaine | Règle |
|---|---|
| **Secrets** | Zéro `sk_test_`, `sk_live_`, clé API en clair. Split : `"sk" + "_test_"` |
| **Stripe** | Client-side → `VITE_PAYMENTS_CLIENT_TOKEN`. Serveur → `process.env.STRIPE_SECRET_KEY` uniquement |
| **RGPD** | Données GPS chauffeurs : accessibles uniquement pendant campagne active. Toute collecte → consentement explicite |
| **DGCCRF** | Prix affichés TTC. Tarifs plancher non modifiables sans mise à jour du fichier `src/lib/payments/setup-fee.ts` |
| **Légal** | Mention légale obligatoire sur tout support : `MoveSpot EI · SIREN 804 671 444 · Baie-Mahault` |
| **Paiement** | Ne jamais débiter deux fois (vérifier flags `setup_fee_charged`, `travel_supplement_charged`) |
| **Git** | Ne jamais pusher sur `main`. Branche : `claude/<feature>-<id>` |

### Étape 3 — Validation sur cas réels

Tester la skill sur **2 ou 3 cas MoveSpot** avant de commiter.

**Format de test :**

```
### Test 1 — <Cas>
Entrée : "<message utilisateur>"
Résultat attendu : <description du livrable>
Résultat obtenu : ✓ / ✗ + explication
```

Si un test échoue → corriger `SKILL.md` avant de commiter. Pas de commit avec un test rouge.

---

## Exemples de skills existantes dans ce dépôt

| Skill | Déclencheur | Livrable |
|---|---|---|
| `seo-audit` | `/seo-audit` | Checklist Go/No-Go, fixes SEO appliqués |
| `ai-seo` | `/ai-seo` | `llms.txt`, Answer-First blocks, JSON-LD GEO |
| `canvas-design` | `/canvas-design` | PDF vectoriel + PNG 300 DPI |
| `humanizer` | `/humanizer` | Texte réécrit sans tics IA, ancré Guadeloupe |
| `youtube-movespot` | `/youtube-movespot` | 3 titres SEO + miniature + script minuté + description |
| `pitch-deck-creator` | `/pitch-deck-creator` | Deck investisseur 11 slides ou commercial B2B 9 slides |
| `caveman` | `/caveman` | Mode concis activé, zéro remplissage |

---

## Conventions de nommage et structure Git

```
.claude/skills/
  <nom>/
    SKILL.md          ← obligatoire
    scripts/          ← optionnel (Python, bash)
    references/       ← optionnel (CSV, palette, données statiques)
```

- Branche : `claude/<nom>-skill-<id>` ou branche courante de session.
- Commit message : `feat(skill): <nom> — <description courte>`
- PR vers `main` : titre `feat(skill): <nom> — <tagline>`

---

## Cas limites et refus

| Situation | Comportement |
|---|---|
| Skill demandée > 500 lignes | Scinder en deux skills ou déplacer en `references/` |
| Skill impliquant paiement Stripe | Vérifier garde-fous section 2 avant tout code |
| Skill demandant des données utilisateurs GPS | Vérifier contrainte RGPD, ne générer que pendant campagne active |
| Skill déjà existante | Lire l'existant, proposer une mise à jour plutôt qu'une création |
| Données tarifaires à inclure | Copier uniquement depuis le tableau "Données officielles" ci-dessous |

---

## Données officielles MoveSpot (immuables)

| Donnée | Valeur exacte |
|---|---|
| Tarif annonceur plancher | 25 €/jour par véhicule |
| Tarif à la zone standard | 1,80 €/km²/jour |
| Tarif grande agglomération | 2,70 €/km²/jour |
| Reversement propriétaire | 70 % → minimum 17,50 €/jour |
| Pic zone dense | jusqu'à 49 €/jour par véhicule |
| Essai propriétaire | 14 jours sans engagement |
| Intervalle GPS | toutes les 30 secondes |
| Délai validation véhicule | 48 heures ouvrées |
| Abonnement poseur Starter | 29 €/mois |
| Abonnement poseur Standard | 42 €/mois |
| Abonnement poseur Pro | 59 €/mois |
| SIREN | 804 671 444 |
| SIRET | 80467144400052 |
| Siège | Baie-Mahault, Guadeloupe |
| URL officielle | https://move-spot.com |

---

## Checklist avant commit

- [ ] En-tête YAML présent (`name`, `description` avec déclencheurs)
- [ ] < 500 lignes
- [ ] Sections : Déclenchement, Règles, Cas limites, Checklist
- [ ] Garde-fous MoveSpot vérifiés (secrets, RGPD, DGCCRF, légal)
- [ ] 2–3 tests sur cas réels MoveSpot passés ✓
- [ ] Aucun chiffre inventé (tous issus du tableau officiel)
- [ ] Commit message : `feat(skill): <nom> — <description>`
- [ ] Branche correcte (jamais `main`)
