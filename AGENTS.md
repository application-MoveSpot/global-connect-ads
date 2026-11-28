# Project architecture rules

- Incident administration must verify has_role through the authenticated client before privileged reads or updates; incident email alerts use a fixed admin recipient and event-derived idempotency, and email failures must never prevent report persistence.
- Legacy financial query results use scoped PostgREST overrideTypes when generated types lag existing migrations; keep generated clients untouched and preserve the selected fields and charging rules during type-only repairs.
- Legacy function helpers use the imported SupabaseClient type and native promises before catch; normalize to-one relations with singleRelation and reject missing or ambiguous assigned profiles, because query builders and embedded cardinality are not ordinary promises or guaranteed objects.
- The standalone /promo-short studio omits site chrome but retains BetaGuard; an AudioContext clock drives a client-only R3F scene composited with aligned captions onto one 1080×1920 canvas. MediaRecorder combines its video track with a Web Audio destination, so export includes the same picture and audio as preview in the actual supported format; saved narration is reused without page-load regeneration. Studio vinyl uses DecalGeometry projected onto body triangles, avoiding floating panels and wheel/glass coverage.

- Public provider listings use the restricted public_provider_profiles view with approved status and Stripe active/trialing filtering; its explicit public-field allowlist permits anonymous reads without exposing private profile fields.

- AppBrandShell supplies a white official-logo band around all page states; CSS suppresses it only when the rendered page already has a branded header, preventing duplicate navigation without changing authentication.
- AI brief summary cache grants are read-only for authenticated advertisers with owner-scoped RLS, with writes reserved to service_role; cache schema lives in applied migrations rather than hand-written database types.
- Refund and chat AI schema is restored through applied additive Drizzle migrations; caches have privileged-only writes, translations inherit message visibility, and summary uniqueness is per conversation and user to prevent cross-user cache leakage.
- Never install legacy AI database triggers targeting another backend; automatic analysis requires a verified same-backend service so unavailable AI cannot block message or refund persistence.

- Logo background removal uses an isolated public fetch to the externally deployed remove-logo-bg endpoint without session tokens or cookies; never repoint the app auth/database client for this integration.

- Covering geometry uses validated clockwise quadrilaterals in a shared centered 16:9 object-cover frame and CSS matrix3d homography solved with ml-matrix; all artwork shares one projected plane so logos and colors follow the same perspective. Newly saved zones include the raw photo path to prevent reuse after photo reordering; preserve legacy index-only zones.

- Covering editor corners support pointer dragging and pixel keyboard nudging; normalize reverse winding before saving but reject crossed polygons, so users can refine door edges without weakening projection validation.

- Booking availability uses the dates-only `get_vehicle_booked_periods` RPC with explicit execution grants; never broaden campaign row read policies for availability, because those rows contain private contact and financial data.

- AI image analysis must inline trusted Cloud Storage image bytes with their actual MIME type, rather than sending signed URLs to providers, because crawler restrictions can reject otherwise accessible photos.

- AI brief actions return typed error results for expired sessions or provider failures, because thrown HTTP responses can escape TanStack server functions and blank the page.

- `vehicles.owner_id` references `owner_profiles.id`, never `auth.users.id`: queries that scope vehicles to their owner must resolve the profile first with `getOwnerProfileId()` from `src/lib/fleet/owner-profile.ts`, because filtering on the authenticated id silently returns no rows. `vehicle_positions.owner_id` is the opposite — it stores the authenticated id, so position inserts keep `auth.uid()`.

- Provider plan prices and trial length live in `src/lib/providers/provider-plans.ts`; public installer pages (`/devenir-poseur`) import them and the `setup-fee.ts` constants instead of restating amounts, so marketing copy cannot drift from what is charged.

## Règle absolue — témoignages et avis utilisateurs

**INTERDIT** d'ajouter des témoignages, avis, citations ou retours d'expérience fictifs sur n'importe quelle page publique ou privée de l'application (pages marketing, landing pages, pages "pourquoi nous choisir", pages "exemples", etc.).

Les seuls contenus autorisés dans les sections témoignages sont :

- Un placeholder "à venir" (ex. : "Les premiers témoignages arrivent bientôt")
- Des témoignages réels fournis explicitement par l'équipe MoveSpot avec le nom complet, le rôle et l'accord de la personne

Ne jamais inventer de noms (ex. Sophie M., Karim B.), d'entreprises, de résultats chiffrés ou de citations présentées comme authentiques. Cela constitue une pratique commerciale trompeuse.

Si une section témoignages est vide, utiliser systématiquement le composant placeholder suivant (cf. `/annonceur/exemples`) :

```tsx
<div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
  <p className="text-4xl mb-4">💬</p>
  <p className="font-semibold text-lg mb-2">Les premiers témoignages arrivent bientôt</p>
  <p className="text-sm text-muted-foreground max-w-md mx-auto">
    Vous avez utilisé MoveSpot pour votre campagne ? Nous serions ravis de partager votre
    expérience.
  </p>
  <a
    href="mailto:contact@move-spot.com?subject=Témoignage MoveSpot"
    className="inline-flex items-center gap-2 mt-6 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
  >
    Partager mon expérience →
  </a>
</div>
```

- The browser Supabase client must read the Lovable Cloud backend from env (VITE_SUPABASE_*), never a hard-coded other project, because browser and server must share one auth/database or sign-ups and server functions break.
