# global-connect-ads — MoveSpot

Plateforme de publicité mobile sur véhicules (taxi, VTC, camionnettes, etc.).
Connecte annonceurs, propriétaires de flottes, chauffeurs, prestataires (poseurs) et partenaires.

## Stack technique

- **Framework** : React 19 + TanStack Router (file-based) + TanStack Start (SSR/RSC)
- **Build** : Vite 7 + Cloudflare Workers (`@cloudflare/vite-plugin`)
- **Styles** : Tailwind CSS 4
- **UI** : Radix UI + shadcn/ui (`src/components/ui/`)
- **State serveur** : TanStack Query
- **Backend** : Supabase (DB + Auth + Storage) via `src/integrations/supabase/`
- **Paiements** : Stripe via Lovable (`VITE_PAYMENTS_CLIENT_TOKEN`) — **ne pas utiliser STRIPE_SECRET_KEY directement**
- **Cartes** : Mapbox GL + Leaflet (zones polygones), Turf.js (calculs géo)
- **Email** : React Email + `@lovable.dev/email-js`
- **AI** : AI SDK (`ai`, `@ai-sdk/openai-compatible`) — chatbot FAQ
- **Déploiement** : Lovable platform (preview + production)

## Commandes

```bash
npm run dev        # serveur local
npm run build      # build production
npm run lint       # ESLint
npm run format     # Prettier
```

## Rôles utilisateurs

| Rôle | Préfixe route | Description |
|---|---|---|
| Annonceur | `/annonceur` | Crée des briefs, gère campagnes et portefeuille |
| Propriétaire | `/proprietaire` | Gère sa flotte, répond aux briefs |
| Chauffeur | `/chauffeur` | Espace chauffeur, photos d'installation |
| Prestataire | `/prestataire` | Poseur de publicités, gestion clients |
| Partenaire | `/partenaire` | Partenaire réseau |
| Admin | `/admin` | Dashboard, virements, prestataires |

## Structure des dossiers

```
src/
  routes/          # Pages (TanStack Router file-based)
  components/
    advertiser/    # Composants annonceur (Stripe checkout, portefeuille, etc.)
    owner/         # Propriétaire (carte flotte, Stripe Connect)
    driver/        # Chauffeur (photos installation, jobs)
    provider/      # Prestataire (portfolio, abonnement)
    partner/       # Partenaire
    shared/        # Partagés (CampaignStepper, MobilityMap, BookingForm…)
    app/           # App-level (AppUpdateGuard, FAQChatbot, banners…)
    ui/            # shadcn/ui génériques
  lib/
    campaigns/     # Logique campagnes
    payments/      # Stripe helpers
    fleet/         # Gestion flotte
    geo/           # Géolocalisation
    tracking/      # Suivi campagnes
    ai/            # Chatbot AI
    email/         # Envoi emails
    qr/            # QR codes
    providers/     # Logique prestataires
  integrations/
    supabase/      # Client Supabase, types, middleware auth
  hooks/           # Hooks React custom
```

## Points critiques à connaître

### Paiements Stripe
- Utiliser **`VITE_PAYMENTS_CLIENT_TOKEN`** et l'intégration Lovable, pas `STRIPE_SECRET_KEY` directement.
- Les composants de checkout sont dans `src/components/advertiser/` : `WalletTopupCheckout.tsx`, `CampaignPaymentCheckout.tsx`, `CampaignTrialCheckout.tsx`.
- Le webhook Supabase crédite le portefeuille après paiement validé.

### Routing
- TanStack Router file-based : les routes correspondent aux noms de fichiers dans `src/routes/`.
- `src/routeTree.gen.ts` est **auto-généré** — ne pas modifier manuellement.
- Paramètres dynamiques : `$campaignId`, `$briefId`, `$providerId`.

### Auth
- Supabase Auth, middleware dans `src/integrations/supabase/auth-middleware.ts`.
- RLS Supabase gère les permissions par rôle.

### Cartes
- Mapbox GL pour la carte de flotte (`FleetMap.tsx`).
- Leaflet + `@mapbox/mapbox-gl-draw` pour le dessin de zones polygones (`ZonePolygonDraw.tsx`).
- Turf.js pour les calculs de surface.

### Lovable
- Le fichier `.lovable/plan.md` contient le dernier diagnostic/plan de l'IA Lovable.
- Éviter de modifier les fichiers `.lovable/` manuellement.

## Conventions de code

- TypeScript strict, pas de `any` si possible.
- Composants fonctionnels React avec hooks.
- `cn()` de `src/lib/utils.ts` pour les classes Tailwind conditionnelles.
- Formulaires avec `react-hook-form` + `zod`.
- Toast/notifications via `sonner`.
- Icônes : `lucide-react`.

## Branche de développement courante

Toujours développer sur la branche assignée par la session (format `claude/<feature>-<id>`).
Ne jamais pusher directement sur `main`.
