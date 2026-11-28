# Skill : `frontend-design` — Direction Artistique MoveSpot

Protocole de design frontend pour MoveSpot. Anti-cliché IA. Identité forte, mobile-first, type-safe.

---

## Tokens de design — Source de vérité

```css
/* Couleurs */
--color-bg:        #08090F;   /* bleu nuit */
--color-bg-raised: #0F1118;   /* cartes sur fond nuit */
--color-bg-subtle: #161820;   /* hover, alternances */
--color-fg:        #FFFFFF;   /* texte principal */
--color-fg-muted:  #9CA3AF;   /* texte secondaire */
--color-accent:    #FF6B35;   /* orange vif — CTA, highlights */
--color-accent-bg: rgba(255, 107, 53, 0.12);
--color-accent-hover: #FF8555;
--color-border:    rgba(255,255,255,0.08);
--color-success:   #22C55E;
--color-warning:   #F59E0B;
--color-danger:    #EF4444;

/* Typographie */
--font-display: 'Space Grotesk', system-ui, sans-serif;  /* titres */
--font-body:    'Inter', system-ui, sans-serif;           /* corps */

/* Échelle */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   18px;
--text-xl:   22px;
--text-2xl:  28px;
--text-3xl:  36px;

/* Radius */
--radius-sm:  6px;
--radius-md:  10px;
--radius-lg:  16px;
--radius-xl:  24px;

/* Ombres (contraste élevé sur fond nuit) */
--shadow-sm:  0 1px 4px rgba(0,0,0,.4);
--shadow-md:  0 4px 16px rgba(0,0,0,.5);
--shadow-lg:  0 8px 32px rgba(0,0,0,.6);
--shadow-accent: 0 4px 20px rgba(255,107,53,.25);
```

---

## Protocole avant chaque modification UI

Répondre à ces 5 points **avant** d'écrire une ligne de CSS/JSX :

1. **Intention visuelle** — Quel état émotionnel cette UI doit-elle créer ? (confiance, urgence, clarté de données)
2. **Palette & Contraste** — Ratio WCAG AA minimum 4.5:1 sur tous les textes. Vérifier avec les tokens ci-dessus.
3. **Typographie** — Space Grotesk pour les titres assertifs ; Inter pour le corps. Hiérarchie marquée : jamais deux niveaux identiques sur la même vue.
4. **Composition** — Grille asymétrique préférée au centrage uniforme. Espacement généreux : `gap-6` minimum entre sections.
5. **Détails interactifs** — Définir hover, focus-visible, état vide (empty state), skeleton loading, et breakpoint `375px` avant livraison.

---

## Anti-patterns interdits (AI slop)

| Interdit | Remplacer par |
|---|---|
| Fond blanc `#FFFFFF` uniforme | `--color-bg` (#08090F) ou `--color-bg-raised` |
| Dégradé violet/rose générique | Dégradé `#08090F → #0F1118` + accent orange |
| `Inter` seul partout | Space Grotesk titres + Inter corps |
| Ombres `box-shadow: 0 2px 4px rgba(0,0,0,.1)` | Ombres profondes avec opacité 0.4–0.6 |
| Bouton CTA bleu générique | Bouton accent `--color-accent` + `--shadow-accent` |
| Cards sans relief sur fond blanc | Cards `--color-bg-raised` + bordure `--color-border` |
| Icônes colorées aléatoires | Lucide React, couleur `--color-accent` ou `--color-fg-muted` |
| Animations `transition: all 0.3s` | `transition: transform 0.2s ease, opacity 0.15s ease` |

---

## Éléments visuels identitaires MoveSpot

### Données GPS / Tracking
- Afficher les traces de parcours avec `stroke: --color-accent`, `opacity: 0.6`
- Pulsation du point en temps réel : keyframe `scale(1) → scale(1.4) → scale(1)`, 2s, ease-in-out
- Fond carte : tiles sombres Mapbox style `dark-v11`

### Véhicules & Flotte
- Badges statut : `EN ROUTE` → vert `#22C55E` ; `PAUSE` → orange `--color-accent` ; `HORS SERVICE` → rouge `--color-danger`
- Miniatures véhicule : ratio 16:9, border-radius `--radius-md`, overlay gradient bottom-to-top pour le texte

### KPIs & Métriques
- Chiffre principal : `--text-3xl`, `font-weight: 700`, Space Grotesk, couleur blanche
- Label : `--text-xs`, `--color-fg-muted`, `letter-spacing: 0.08em`, uppercase
- Variation positive : `--color-success` + icône `TrendingUp`
- Variation négative : `--color-danger` + icône `TrendingDown`

### Boutons
```
Primary  : bg --color-accent, hover --color-accent-hover, shadow --shadow-accent
Secondary: bg transparent, border 1px --color-border, hover bg --color-bg-subtle
Ghost    : bg transparent, hover bg --color-accent-bg, color --color-accent
Danger   : bg transparent, border 1px --color-danger, hover bg rgba(239,68,68,.1)
```

---

## Garde-fous MoveSpot — Non négociables

### Éléments à ne jamais supprimer ni déplacer
- Bandeau RGPD / consentement cookies
- Mentions légales (CGU, CGV, politique de confidentialité)
- Cases de consentement dans les formulaires d'inscription
- Indicateurs de vérification RC Pro et assurance auto (badges admin)
- Verrous de paiement Stripe (ne pas contourner les étapes de confirmation)

### Vérifications obligatoires avant livraison
1. `tsc --noEmit` — zéro erreur TypeScript
2. Rendu `375px` (iPhone SE) — zéro overflow horizontal, zéro texte tronqué
3. Contraste WCAG AA — ratio ≥ 4.5:1 sur tous les textes body
4. États vides (empty states) définis pour chaque liste ou tableau
5. Skeleton loading sur chaque fetch asynchrone visible

### Composants modifiables sans restriction
- Couleurs, espacements, typographie (en respectant les tokens)
- Animations et micro-interactions
- Layout et composition

### Composants à modifier avec confirmation
- Navigation principale et routes
- Formulaires d'authentification (Supabase Auth)
- Flux de paiement (Stripe Checkout)
- Dashboard admin (permissions RLS)

---

## Checklist qualité — avant chaque PR UI

- [ ] Protocole 5 points appliqué (intention → détails interactifs)
- [ ] Zéro anti-pattern AI slop
- [ ] Tokens de design utilisés (pas de valeurs hardcodées)
- [ ] `tsc --noEmit` ✓
- [ ] Rendu 375px ✓
- [ ] Éléments légaux/RGPD intacts ✓
- [ ] Empty states définis ✓
- [ ] Skeleton loading défini ✓
