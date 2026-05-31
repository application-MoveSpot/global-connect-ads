# Plan — Espace propriétaires MoveSpot

Objectif : permettre aux propriétaires de véhicules (food trucks, vans, taxis, scooters) de s'inscrire, proposer leurs véhicules, et recevoir des demandes de campagnes — avec validation admin.

## 1. Base de données (migration unique)

**Enum** `vehicle_type` : `food_truck`, `van`, `taxi`, `scooter`, `voiture`, `autre`
**Enum** `vehicle_status` : `pending`, `approved`, `rejected`, `paused`
**Enum** `app_role` : ajouter `owner` à l'existant (`admin`, `user`)

**Tables** :
- `owner_profiles` (lié à `auth.users`) : full_name, phone, company, city, bio
- `vehicles` : owner_id, type, name, description, format_publicitaire, surface_m2, km_per_day, zones (text[]), price_per_day, photos (text[] = URLs storage), status, admin_notes
- `campaign_requests` : ajouter `vehicle_id` (nullable, pour rétro-compat) + colonne `owner_response` (pending/accepted/rejected)

**Storage bucket** `vehicle-photos` (public) avec RLS : owner uploade dans `{user_id}/...`

**RLS** :
- `owner_profiles` : owner CRUD ses propres données ; admin lit tout
- `vehicles` : owner CRUD ses propres véhicules ; public lit ceux `approved` ; admin tout
- `campaign_requests` : owner lit/update ceux de ses véhicules ; reste inchangé

**Trigger** : à la création d'un `owner_profile`, ajouter le rôle `owner` dans `user_roles`.

## 2. Authentification

- Réutiliser `/auth` existant (signup email + Google via `lovable.auth.signInWithOAuth`)
- Activer Google via `configure_social_auth`
- Après signup propriétaire : créer `owner_profile` puis rediriger vers `/proprietaire`

## 3. Pages frontend

- **`/devenir-partenaire`** (public) : landing pitch + CTA "Inscrivez-vous"
- **`/proprietaire/inscription`** : form profil + 1er véhicule (multi-étapes simple)
- **`/proprietaire`** (protégé, layout `_authenticated`) :
  - liste de mes véhicules + statut (pending/approved/rejected)
  - bouton "Ajouter un véhicule"
  - liste des demandes de campagne reçues → accepter/refuser
- **`/proprietaire/vehicules/nouveau`** et `/proprietaire/vehicules/$id` (édition)
- **`/admin`** existant : ajouter onglet "Véhicules à valider" avec approve/reject

## 4. Marketplace (`AdSpots.tsx`)

Remplacer la liste fictive par les véhicules `approved` depuis la DB (via server fn publique avec `supabaseAdmin` projetant uniquement les colonnes safe).

## 5. Header / navigation

- Ajouter lien "Devenir partenaire" dans le header de `index.tsx`
- Si user connecté avec rôle `owner` : lien "Mon espace"

## Détails techniques

- Server functions dans `src/lib/owners.functions.ts` (createOwnerProfile, listMyVehicles, createVehicle, listMyRequests, respondToRequest) avec `requireSupabaseAuth`
- Server functions admin dans `src/lib/admin.functions.ts` (listPendingVehicles, approveVehicle, rejectVehicle)
- Upload photos via `supabase.storage.from('vehicle-photos').upload()` côté client
- Validation Zod sur chaque server fn
- Vérifier `attachSupabaseAuth` dans `src/start.ts`

## Hors scope (volontaire)

- Pas de paiement automatisé (admin/owner gèrent hors plateforme pour l'instant)
- Pas de messagerie interne (email/téléphone fournis dans la demande)
- Pas de géoloc temps réel des véhicules
