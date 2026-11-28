# Skill : `web-design-guidelines` — QA Technique Front-End MoveSpot

Checklist d'assurance qualité avant chaque déploiement. Basée sur Vercel Web Interface Guidelines, adaptée React / Tailwind / shadcn-ui / TanStack Router.

---

## 1 — Accessibilité & Navigation Clavier

### ARIA
- Tout bouton icône (sans texte visible) : `aria-label` obligatoire.
  ```tsx
  <Button aria-label="Fermer la modal"><X /></Button>
  ```
- États dynamiques : `aria-expanded`, `aria-selected`, `aria-current="page"` sur nav active.
- Listes de données : `role="list"` si `<ul>` stylistiquement reset.
- Images informatives : `alt` descriptif. Images décoratives : `alt=""` + `aria-hidden="true"`.
- Modals : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant vers le titre.

### Focus
```css
/* Tailwind — à appliquer sur tout élément interactif */
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090F]
```
- Zéro `outline: none` sans `focus-visible` compensatoire.
- Ordre de tabulation = ordre visuel. Jamais de `tabindex > 0` sauf exception justifiée.
- Focus piégé dans modals / drawers : utiliser `@radix-ui/react-focus-trap` (inclus dans shadcn Dialog).

### Balisage sémantique
```html
<header>   <!-- navigation principale, logo -->
<main>     <!-- contenu unique de la page, 1 seul par page -->
<nav>      <!-- menus de navigation, aria-label si plusieurs -->
<section>  <!-- sections avec titre h2/h3 associé -->
<article>  <!-- contenu autonome (card campagne, card véhicule) -->
<aside>    <!-- sidebar, panneaux secondaires -->
<footer>   <!-- pied de page, mentions légales -->
```
Zéro `<div>` là où un élément sémantique s'applique.

---

## 2 — Formulaires & Saisie

### Labels
```tsx
// ✓ Correct
<Label htmlFor="phone">Téléphone</Label>
<Input id="phone" ... />

// ✗ Interdit
<Input placeholder="Téléphone" />  // placeholder ≠ label
```
Champ obligatoire : `aria-required="true"` + indicateur visuel `*` avec `<span aria-hidden="true">*</span>`.

### Attributs `autocomplete` & `inputMode`

| Champ | `autocomplete` | `inputMode` |
|---|---|---|
| Prénom | `given-name` | `text` |
| Nom | `family-name` | `text` |
| Email | `email` | `email` |
| Téléphone | `tel` | `tel` |
| SIRET/SIREN | `off` | `numeric` |
| Plaque immatriculation | `off` | `text` |
| Prix / Montant € | `off` | `decimal` |
| Code postal | `postal-code` | `numeric` |

### Validation
- Erreurs inline Zod : afficher sous le champ, jamais uniquement via toast.
- Jamais effacer la saisie à la soumission en cas d'erreur.
- Message d'erreur : `role="alert"`, `aria-live="assertive"` pour lecture screen reader.
  ```tsx
  {error && <p role="alert" className="text-status-danger text-sm mt-1">{error}</p>}
  ```

### Boutons submit
```tsx
<Button type="submit" disabled={isPending}>
  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
  {isPending ? 'Envoi en cours…' : 'Soumettre'}
</Button>
```
- Désactivé **uniquement** pendant la requête active (`isPending`).
- Jamais désactivé sur un formulaire vide sans feedback explicatif (`aria-describedby` → texte d'aide).

---

## 3 — Performance & Rendu Visuel

### CLS — Zéro décalage de mise en page
Toute image doit avoir dimensions explicites ou `aspect-ratio` :
```tsx
// ✓ Dimensions fixes
<img src={url} width={320} height={180} alt="..." />

// ✓ Aspect ratio Tailwind
<div className="aspect-video w-full overflow-hidden rounded-lg">
  <img src={url} className="size-full object-cover" alt="..." />
</div>

// ✗ Interdit — décalage garanti
<img src={url} alt="..." />
```

### Lazy loading
```tsx
// Au-dessus de la fold (LCP) : eager (défaut)
<img src={hero} loading="eager" fetchPriority="high" alt="..." />

// Sous la fold : lazy obligatoire
<img src={vehicle} loading="lazy" alt="..." />
```

### `prefers-reduced-motion`
```css
/* Tailwind — sur toute animation non essentielle */
motion-safe:animate-pulse
motion-safe:transition-transform

/* CSS custom */
@media (prefers-reduced-motion: reduce) {
  .gps-pulse { animation: none; }
  .slide-in  { transition: none; }
}
```
Animations conservées même en reduced-motion : indicateurs de chargement (spinner), barres de progression (réduire durée, pas supprimer).

### Fonts
```html
<!-- Précharger les fonts critiques -->
<link rel="preload" as="font" href="/fonts/SpaceGrotesk-Bold.woff2" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

---

## 4 — Typographie & Navigation URL

### Typographie française
- Guillemets : `« ` … ` »` (espaces insécables à l'intérieur).
- Espaces insécables avant `?`, `!`, `:`, `;`, `€`, `%` → ` ` ou `&nbsp;` en JSX.
  ```tsx
  // ✓
  <span>149{' '}€/mois</span>
  <span>Commission{' '}: 25{' '}%</span>
  ```
- Apostrophe typographique : `'` (`’`), pas `'`.

### Troncature
```tsx
// 1 ligne
<p className="truncate max-w-[200px]">{longText}</p>

// N lignes (Tailwind)
<p className="line-clamp-2">{longText}</p>

// Tooltip sur troncature
<Tooltip>
  <TooltipTrigger asChild>
    <p className="truncate">{longText}</p>
  </TooltipTrigger>
  <TooltipContent>{longText}</TooltipContent>
</Tooltip>
```
Zéro débordement de texte hors de son conteneur : vérifier à `375px` ET avec contenu long (prénom 30 chars, nom de campagne 60 chars).

### Synchronisation URL ↔ État UI
Filtres, onglets, pages : état dans les search params via TanStack Router.
```tsx
// TanStack Router — search params
const { tab, page, status } = Route.useSearch()
const navigate = useNavigate()

// Mise à jour sans rechargement
navigate({ search: (prev) => ({ ...prev, tab: 'campagnes' }) })
```
- Retour arrière navigateur doit restaurer l'état de l'UI.
- Partager un lien avec filtres actifs = même rendu pour le destinataire.
- Zéro état UI critique stocké uniquement dans `useState` s'il doit survivre au refresh.

---

## Checklist Déploiement — Go / No-Go

### Accessibilité
- [ ] Tous les boutons icônes ont `aria-label`
- [ ] `focus-visible:ring` sur tous les éléments interactifs
- [ ] Balisage sémantique (`<main>`, `<nav>`, `<header>`) en place
- [ ] Modals : focus piégé + `aria-modal` + `aria-labelledby`

### Formulaires
- [ ] Tous les inputs ont un `<Label htmlFor>` associé
- [ ] `autocomplete` et `inputMode` adaptés par type de champ
- [ ] Erreurs inline avec `role="alert"`
- [ ] Submit button : disabled + spinner uniquement pendant requête

### Performance
- [ ] Toutes les images ont `width`/`height` ou `aspect-ratio`
- [ ] `loading="lazy"` sous la fold, `fetchPriority="high"` sur LCP
- [ ] Animations respectent `prefers-reduced-motion`
- [ ] `tsc --noEmit` — zéro erreur

### Typographie & URL
- [ ] Espaces insécables avant `€`, `%`, `?`, `!`, `:`
- [ ] Troncature propre vérifiée à 375px avec contenu long
- [ ] Filtres/onglets actifs reflétés dans l'URL (search params)

### RGPD & Légal — Non négociables
- [ ] Bandeau consentement intact
- [ ] Liens CGU/CGV accessibles depuis le footer
- [ ] Cases de consentement formulaires d'inscription présentes
- [ ] Badges RC Pro / assurance visibles (admin)
