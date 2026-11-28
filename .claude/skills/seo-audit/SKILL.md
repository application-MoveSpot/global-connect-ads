# Skill : `seo-audit` — Audit SEO MoveSpot

Checklist d'audit SEO technique, SEO local Guadeloupe / France et GEO (visibilité IA).

## Déclenchement

`/seo-audit` ou message contenant "audit SEO", "vérifier le SEO", "optimiser le référencement", "GEO MoveSpot".

---

## 1 — SEO Technique & Indexation

### Balises `<title>` & `<meta description>`
- Chaque route publique doit utiliser `buildSeoHead()` depuis `@/components/SEO` (jamais de `head()` manuel sans canonical ni Twitter Cards).
- Titre : 50–60 caractères, français en premier, format `[Mot-clé principal] — MoveSpot`.
- Description : 120–155 caractères, bénéfice chiffré, mot-clé local si page géo-ciblée.
- Vérifier longueur : `title.length` et `description.length` dans le code.

### Open Graph & Twitter Cards
Obligatoires sur chaque route publique :
```tsx
// buildSeoHead() injecte automatiquement :
{ property: "og:title" }         // = title
{ property: "og:description" }   // = description
{ property: "og:url" }           // = canonical
{ property: "og:image" }         // = ogImage (défaut : og-image.png 1200×630)
{ name: "twitter:card" }         // = summary_large_image
{ name: "twitter:site" }         // = @movespot_pub
{ name: "twitter:title" }
{ name: "twitter:description" }
{ name: "twitter:image" }
```
Vérifier que les routes utilisant `head()` manuel ont bien ces 9 propriétés.

### Canonique & Hreflang
- `<link rel="canonical">` sur chaque route publique.
- `hreflangLinks()` depuis `@/lib/seo` injecté via `buildSeoHead` (sauf `noHreflang: true`).

### `robots.txt`
- Toutes les routes sous `/admin`, `/advertiser`, `/owner`, `/driver`, `/provider`, `/partner` → `Disallow`.
- `Sitemap:` pointant vers `https://move-spot.com/sitemap.xml`.
- Incohérence critique : une URL dans `sitemap.xml` ne doit jamais être sous un chemin `Disallow`.

### `sitemap.xml`
- Toutes les routes publiques indexables présentes.
- Pages landing géo-ciblées incluses (`/publicite-voiture-guadeloupe`, `/publicite-voiture-paris`, etc.).
- `<lastmod>` à jour. `<priority>` cohérente avec l'importance commerciale.

### Hiérarchie sémantique
- Exactement 1 `<h1>` par page.
- `<h2>` et `<h3>` hiérarchie logique (pas de `<h3>` sans `<h2>` parent).
- Toutes les `<img>` : `alt` descriptif (ou `alt=""` + `aria-hidden="true"` si décoratif).

---

## 2 — SEO Local Guadeloupe & Données Structurées

### JSON-LD `LocalBusiness` + `AdvertisingAgency`
Vérifier dans `__root.tsx` :
```json
{
  "@type": ["LocalBusiness", "AdvertisingAgency"],
  "name": "MoveSpot",
  "taxID": "804671444",
  "address": {
    "streetAddress": "1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg",
    "addressLocality": "Baie-Mahault",
    "postalCode": "97122",
    "addressRegion": "Guadeloupe",
    "addressCountry": "FR"
  },
  "areaServed": [
    "Guadeloupe", "Baie-Mahault", "Jarry", "Pointe-à-Pitre",
    "Le Gosier", "Basse-Terre", "France"
  ]
}
```

### Mots-clés haute intention Guadeloupe (à intégrer dans titres/descriptions)
- `publicité véhicule Guadeloupe`
- `covering publicitaire Jarry`
- `monétiser sa voiture Guadeloupe`
- `publicité sur taxi Guadeloupe`
- `régie publicitaire Baie-Mahault`
- `pose vinyle publicitaire Guadeloupe`

---

## 3 — GEO (Generative Engine Optimization)

### FAQPage JSON-LD (ChatGPT / Gemini / Perplexity)
Chaque audience doit avoir son `FAQPage` sur sa landing principale :
- `FAQ_ADVERTISERS_JSON_LD` → page d'accueil (`/`) ✓
- `FAQ_OWNERS_JSON_LD` → page d'accueil ou `/commencer` ✓
- `FAQ_POSEURS_JSON_LD` → `/devenir-partenaire` ou `/commencer`
- `FAQ_GUADELOUPE_JSON_LD` → `/publicite-voiture-guadeloupe`

### Contenu conversationnel (questions directes)
Les FAQ doivent répondre aux formulations verbatim utilisées dans les moteurs IA :
- "Combien coûte une pub sur une voiture en Guadeloupe ?"
- "Comment trouver un poseur de covering en Guadeloupe ?"
- "Est-ce que MoveSpot est légal en Guadeloupe ?"
- "Quelle est la différence entre MoveSpot et JCDecaux ?"

---

## Checklist d'audit — Go / No-Go

### Indexation
- [ ] `buildSeoHead()` sur chaque route publique (zéro `head()` manuel sans Twitter Cards)
- [ ] Titres 50–60 chars, français en premier
- [ ] Descriptions 120–155 chars avec bénéfice chiffré
- [ ] Canonical + hreflang sur chaque route publique
- [ ] robots.txt cohérent avec sitemap.xml (zéro URL Disallow dans le sitemap)
- [ ] Sitemap complet (toutes les landings géo incluses)

### Local & Structuré
- [ ] `LocalBusiness` + `AdvertisingAgency` dans `__root.tsx`
- [ ] Coordonnées légales exactes (SIRET 804671444, adresse Baie-Mahault)
- [ ] `areaServed` inclut Guadeloupe, Jarry, Baie-Mahault, Pointe-à-Pitre

### GEO
- [ ] `FAQPage` JSON-LD pour annonceurs, propriétaires et poseurs
- [ ] Questions formulées en langage naturel (style recherche vocale / IA)
- [ ] `HowTo` JSON-LD sur `/devenir-partenaire` ou `/comment-ca-marche`

### Technique
- [ ] `tsc --noEmit` — zéro erreur
- [ ] Éléments RGPD/légaux non touchés
- [ ] `alt` descriptif sur toutes les `<img>` des pages auditées
