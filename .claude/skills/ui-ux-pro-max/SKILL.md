# Skill : `ui-ux-pro-max` — UX/UI MoveSpot Pro

Design système cohérent + UX conversion sur tunnels Annonceur / Conducteur / Poseur. Stack : React 19 + Tailwind CSS 4 + shadcn/ui.

---

## 1 — Design System

### Grille & Espacement
- Unité de base : **8px**. Toutes les marges/paddings sont multiples de 8px.
- Exceptions autorisées : 4px (micro-espacement intra-composant), 2px (bordures, séparateurs).
- Tailwind mapping : `p-2`=8px · `p-3`=12px · `p-4`=16px · `p-6`=24px · `p-8`=32px · `p-12`=48px

### Tokens de couleurs — Tailwind config
```ts
// tailwind.config.ts
colors: {
  brand: {
    night:       '#08090F',  // bg principal
    'night-raised': '#0F1118',
    'night-subtle': '#161820',
    orange:      '#FF6B35',  // accent action
    'orange-hover': '#FF8555',
    'orange-bg': 'rgba(255,107,53,0.12)',
  },
  content: {
    primary:  '#FFFFFF',
    muted:    '#9CA3AF',
    disabled: '#4B5563',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    danger:  '#EF4444',
    info:    '#3B82F6',
  },
  border: {
    DEFAULT: 'rgba(255,255,255,0.08)',
    strong:  'rgba(255,255,255,0.16)',
  },
}
```

### Typographie — Hiérarchie fluide
| Niveau | Taille | Police | Poids | Usage |
|---|---|---|---|---|
| `display` | clamp(28px,5vw,48px) | Space Grotesk | 700 | Héros, landing |
| `h1` | 36px | Space Grotesk | 700 | Titre de page |
| `h2` | 28px | Space Grotesk | 600 | Section |
| `h3` | 22px | Space Grotesk | 600 | Card title |
| `h4` | 18px | Inter | 600 | Sous-section |
| `body` | 15px | Inter | 400 | Corps |
| `small` | 13px | Inter | 400 | Labels, captions |
| `micro` | 11px | Inter | 500 | Badges, overlines |

Règle : jamais deux niveaux identiques sur la même vue. `letter-spacing: 0.06em` sur uppercase micro.

### Contrastes WCAG AA (minimum obligatoire)
- Texte sur `#08090F` : minimum `#9CA3AF` (ratio 4.6:1 ✓)
- CTA orange `#FF6B35` sur `#08090F` : ratio 4.9:1 ✓
- Texte blanc sur `#FF6B35` : ratio 3.1:1 — **ne pas utiliser pour du texte body**

### Radius
```
rounded-sm  = 4px   (badges inline)
rounded     = 6px   (inputs, chips)
rounded-md  = 8px   (boutons, cards sm)
rounded-lg  = 12px  (cards md)
rounded-xl  = 16px  (modals, panels)
rounded-2xl = 24px  (hero cards)
```

---

## 2 — UX Conversion par Tunnel

### Principes universels
- **1 action principale par écran.** CTA secondaire toujours visuellement hiérarchiquement inférieur.
- **Progression visible.** Étapes numérotées ou barre de progression sur tout tunnel > 2 étapes.
- **Réassurance immédiate.** Afficher avant la décision de paiement : badge GPS certifié, badge Stripe séquestre, badge RC Pro / assurance vérifiée.
- **Calculateur interactif.** Chaque tunnel avec données financières → slider ou input avec résultat temps réel (ex. "Votre gain estimé : X €/mois").

### Tunnel Annonceur
```
Étape 1 : Simulateur de zone (carte Mapbox, slider budget)
         → KPI temps réel : impressions/jour estimées
Étape 2 : Choix pack (Starter 49€ / Standard 79€ / Boost 149€)
         → Comparaison visuelle, pack recommandé mis en avant
Étape 3 : Formulaire minimal (nom, email, SIRET optionnel)
         → Validation Zod inline, zéro soumission avant complétion
Étape 4 : Checkout Stripe
         → Récapitulatif clair, logo Stripe visible, mention "Paiement sécurisé"
```

### Tunnel Conducteur / Propriétaire
```
Étape 1 : Formulaire véhicule (plaque, marque, modèle, couleur)
         → Photo optionnelle, aperçu de fiche véhicule en temps réel
Étape 2 : Upload assurance auto
         → Drag & drop + preview PDF/image, feedback immédiat de taille/format
Étape 3 : Essai 14 jours gratuit — confirmation
         → Pas de CB requise, badge "Zéro engagement"
```

### Tunnel Poseur / Prestataire
```
Étape 1 : Informations professionnelles + SIRET
Étape 2 : Upload RC Pro
         → Vérification admin async → badge "En cours de vérification"
Étape 3 : Choix abonnement (Starter 29€ / Standard 42€ / Pro 59€/mois)
         → Toggle mensuel/annuel (-20%), card recommandée mise en avant
Étape 4 : Stripe Connect onboarding
         → Lien direct, instructions étape par étape
```

---

## 3 — Ergonomie Mobile-First

### Zones tactiles
- Minimum `44×44px` sur tout élément interactif (boutons, liens, toggles, chips).
- Sur Guadeloupe terrain (soleil, gants, humidité) → préférer `48×48px` pour les CTA critiques.
- Implémentation Tailwind : `min-h-[44px] min-w-[44px]` ou `py-3 px-4` minimum.

### Responsive obligatoire
- Zéro overflow horizontal sur `375px` (iPhone SE).
- Vérifier : tableaux → `overflow-x-auto` wrapper ; cartes longues → stack vertical sous `sm:` ; grilles → `grid-cols-1 sm:grid-cols-2`.
- Navigation mobile : bottom bar ou drawer, jamais hamburger seul sans bottom nav.

### Skeletons & Loading states
```tsx
// Pattern standard — shadcn/ui Skeleton
<div className="animate-pulse space-y-3">
  <Skeleton className="h-4 w-3/4 bg-brand-night-subtle" />
  <Skeleton className="h-4 w-1/2 bg-brand-night-subtle" />
</div>
```
- Skeleton sur tout composant avec fetch > 300ms attendu.
- Zéro spinner seul sans skeleton de layout (évite le "layout jump").

### Micro-interactions
```css
/* Hover bouton */
transition: transform 0.15s ease, box-shadow 0.15s ease;
hover: transform: translateY(-1px); box-shadow: var(--shadow-accent);

/* Focus visible (accessibilité) */
focus-visible: outline: 2px solid #FF6B35; outline-offset: 2px;

/* Card hover */
transition: border-color 0.2s ease, background 0.2s ease;
hover: border-color: rgba(255,107,53,0.3); background: #0F1118;

/* Badge pulse GPS */
@keyframes gps-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.6; transform:scale(1.3); } }
animation: gps-pulse 2s ease-in-out infinite;
```

### États vides (Empty States)
Structure obligatoire sur tout composant liste/tableau :
```tsx
<div className="flex flex-col items-center gap-4 py-16 text-center">
  <Icon className="size-12 text-content-muted" />
  <div>
    <p className="text-h4 text-content-primary">[Titre état vide]</p>
    <p className="text-small text-content-muted mt-1">[Message explicatif court]</p>
  </div>
  <Button variant="default">[CTA principal]</Button>
</div>
```

---

## 4 — Checklist Audit UX — Avant Livraison

### Accessibilité
- [ ] Tous les `<img>` ont un `alt` descriptif (ou `alt=""` si décoratif)
- [ ] Tous les inputs ont un `<label>` associé ou `aria-label`
- [ ] Focus clavier visible sur tous les éléments interactifs (`focus-visible`)
- [ ] Couleurs jamais seules pour porter une information (icône ou texte aussi)
- [ ] Modals : focus piégé dans la modal, `role="dialog"`, `aria-labelledby`

### Performance
- [ ] Images : `loading="lazy"` sur tout ce qui est sous la fold
- [ ] Cartes Mapbox : chargement différé, skeleton pendant l'init
- [ ] Listes longues (> 50 items) : virtualisation (`react-window`) ou pagination
- [ ] `React.memo` sur les composants de liste coûteux

### États & Erreurs
- [ ] État vide défini sur chaque liste/tableau
- [ ] État d'erreur défini sur chaque fetch (message + bouton retry)
- [ ] État de chargement (skeleton) sur chaque fetch
- [ ] Formulaires : erreurs inline Zod, jamais uniquement via toast

### RGPD & Légal — Non négociables
- [ ] Bandeau consentement cookies intact
- [ ] Cases de consentement dans formulaires d'inscription
- [ ] Liens CGU/CGV/Politique de confidentialité accessibles
- [ ] Badges vérification RC Pro / assurance auto visibles (admin)
- [ ] Flux Stripe non contourné (étapes de confirmation intactes)

### Code & Compilation
- [ ] `tsc --noEmit` — zéro erreur
- [ ] Zéro style hardcodé (utiliser les tokens Tailwind)
- [ ] Zéro `any` TypeScript introduit
- [ ] Composants shadcn/ui utilisés en priorité sur du CSS custom

---

## Composants shadcn/ui — Mapping MoveSpot

| Besoin | Composant shadcn | Customisation |
|---|---|---|
| Bouton CTA | `Button` variant `default` | bg orange, shadow-accent |
| Bouton secondaire | `Button` variant `outline` | border brand-border |
| Input formulaire | `Input` | bg night-raised, border on focus |
| Sélecteur | `Select` | même thème que Input |
| Modal | `Dialog` | bg night, rounded-xl |
| Drawer mobile | `Sheet` side=bottom | rounded-t-2xl |
| Notifications | `Sonner` | dark theme, accent orange |
| Tabs navigation | `Tabs` | underline variant, accent orange |
| Badge statut | `Badge` | variant par status (success/warning/danger) |
| Carte de données | `Card` | bg night-raised, border brand-border |
| Tooltip info | `Tooltip` | bg night-subtle, text-sm |
| Popover détail | `Popover` | bg night-raised, shadow-lg |
