# Project architecture rules

- Covering geometry uses validated clockwise quadrilaterals in a shared centered 16:9 object-cover frame and CSS matrix3d homography solved with ml-matrix; all artwork shares one projected plane so logos and colors follow the same perspective. Newly saved zones include the raw photo path to prevent reuse after photo reordering; preserve legacy index-only zones.

- Booking availability uses the dates-only `get_vehicle_booked_periods` RPC with explicit execution grants; never broaden campaign row read policies for availability, because those rows contain private contact and financial data.

- AI image analysis must inline trusted Cloud Storage image bytes with their actual MIME type, rather than sending signed URLs to providers, because crawler restrictions can reject otherwise accessible photos.

- AI brief actions return typed error results for expired sessions or provider failures, because thrown HTTP responses can escape TanStack server functions and blank the page.

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
