# Skill : `ai-seo` — GEO & LLMO MoveSpot

Generative Engine Optimization (GEO) et LLM Optimization (LLMO) : être cité en priorité par ChatGPT, Gemini, Perplexity et Google AI Overviews.

## Déclenchement

`/ai-seo` ou message contenant "GEO", "LLMO", "moteurs IA", "llms.txt", "Answer-First", "citer par ChatGPT", "visibilité IA", "Perplexity", "AI Overviews".

---

## 1 — `public/llms.txt` (standard llmstxt.org)

Fichier obligatoire à la racine du domaine. Doit exister à `https://move-spot.com/llms.txt`.

### Règles de rédaction
- Ton factuel, encyclopédique. Zéro marketing, zéro superlatif non sourcé.
- Sections obligatoires : identité légale, modèle économique, tarifs chiffrés, garanties vérifiables, URLs principales.
- Liens vers `llms-full.txt` pour le détail complet.
- Format markdown compatible avec le standard officiel (`# Title`, `> description`, `## Section`, listes).
- Ne pas dépasser 500 mots sur `llms.txt` ; mettre le détail dans `llms-full.txt`.

### Sections standard
```
# [Nom du service]
> [description 1 phrase encyclopédique]

## Identité légale
## Modèle économique
## Tarifs
## Garanties
## URLs
```

---

## 2 — Blocs Answer-First (réponse directe)

Les IA extraient en priorité les premiers 40–80 mots sous un titre question. Chaque page publique clé doit avoir :

### Règles
- **Position** : immédiatement sous le `<h1>` ou la `<h2>` la plus importante de la page, avant tout contenu secondaire.
- **Longueur** : 40–60 mots. Jamais moins de 30, jamais plus de 80.
- **Ton** : encyclopédique, factuel, impersonnel. Pas de "nous", "vous", "notre". Formuler comme une entrée Wikipedia.
- **Zéro superlatif** non prouvé : pas "meilleur", "leader", "révolutionnaire".
- **Données chiffrées** : inclure au moins 1 donnée factuelle vérifiable (tarif, délai, pourcentage).
- **Rendu HTML** : balise `<p>` avec `id="geo-answer"` et `className="sr-only-geo"` ou visible selon le design.

### Exemple — page "/comment-ca-marche"
```
MoveSpot est une régie publicitaire mobile basée à Baie-Mahault (Guadeloupe, France).
Les annonceurs créent un brief géolocalisé (zone, budget, durée) ; des propriétaires de véhicules
acceptent la campagne et activent le suivi GPS. Chaque kilomètre parcouru dans la zone est enregistré
et certifié. Tarif plancher annonceur : 25 €/jour par véhicule.
```

### Questions prioritaires MoveSpot
- "Comment fonctionne la publicité sur véhicule en Guadeloupe ?" → `/comment-ca-marche`
- "Combien coûte une campagne de publicité sur voiture ?" → `/tarifs`
- "Comment devenir conducteur ou poseur partenaire MoveSpot ?" → `/devenir-partenaire`
- "Qu'est-ce que MoveSpot ?" → `/` (homepage)
- "Publicité mobile Guadeloupe avis et tarifs" → `/publicite-voiture-guadeloupe`

---

## 3 — JSON-LD Schema.org complet

### Entités obligatoires sur `__root.tsx`
```json
{
  "@type": ["LocalBusiness", "AdvertisingAgency"],
  "name": "MoveSpot",
  "legalName": "MoveSpot",
  "taxID": "804671444",
  "identifier": { "@type": "PropertyValue", "name": "SIRET", "value": "80467144400052" },
  "address": {
    "streetAddress": "1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg",
    "addressLocality": "Baie-Mahault",
    "postalCode": "97122",
    "addressRegion": "Guadeloupe",
    "addressCountry": "FR"
  },
  "areaServed": ["Baie-Mahault", "Jarry", "Pointe-à-Pitre", "Guadeloupe", "France"]
}
```

### FAQPage par audience
| Audience | Fichier | Status |
|---|---|---|
| Annonceurs | `SEO.tsx` → `FAQ_ADVERTISERS_JSON_LD` | ✓ |
| Propriétaires | `SEO.tsx` → `FAQ_OWNERS_JSON_LD` | ✓ |
| Poseurs | `SEO.tsx` → `FAQ_POSEURS_JSON_LD` | ✓ |

### Schémas additionnels recommandés
- `HowTo` sur `/comment-ca-marche` ✓
- `Service` avec `offers` sur `/` et `/annonceurs-entreprise` ✓
- `FAQPage` sur chaque landing géo-ciblée

---

## 4 — Critères de citation IA

Les moteurs IA (ChatGPT, Gemini, Perplexity) citent en priorité les sources qui :
1. Répondent directement à la question dans les 80 premiers mots de la page
2. Ont un `llms.txt` accessible et bien formé
3. Ont des données structurées JSON-LD correspondant au contenu visible
4. Ne présentent pas de contradiction entre JSON-LD et contenu HTML

### Checklist GEO — Go / No-Go
- [ ] `public/llms.txt` présent, accessible, ≤500 mots
- [ ] `public/llms-full.txt` présent, détail complet
- [ ] Block Answer-First sur chaque page publique clé (40–60 mots)
- [ ] JSON-LD `Organization` + `LocalBusiness` + `AdvertisingAgency` sur `__root.tsx`
- [ ] `FAQPage` pour annonceurs, propriétaires et poseurs
- [ ] Cohérence JSON-LD ↔ contenu HTML (mêmes chiffres, mêmes adresses)
- [ ] `tsc --noEmit` → 0 erreur introduite

---

## 5 — Mots-clés haute intention pour les moteurs IA

Les IA récupèrent ces requêtes verbatim :
- "publicité sur voiture Guadeloupe tarif"
- "combien rapporte publicité sur véhicule"
- "comment fonctionne MoveSpot"
- "régie publicitaire mobile Baie-Mahault"
- "poseur covering Guadeloupe tarif mission"
- "différence MoveSpot JCDecaux"
- "publicité mobile GPS certifié France"
