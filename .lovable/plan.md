# Brief annonceur + droit de suivi

## Réponse à ta question

**Oui, l'annonceur a le droit de suivre le véhicule pendant toute la durée payée de sa campagne** (ex. 24h, 3 jours, etc.). C'est même un argument commercial fort : il paye pour de la visibilité mobile, il doit pouvoir vérifier que le véhicule a bien circulé dans les zones convenues.

On l'inscrit dès maintenant comme règle métier, même si le tracking GPS temps réel sera branché plus tard :

- **Pendant** une `campaign_request` au statut `approved` et dont la période `[start_date, end_date]` couvre aujourd'hui → l'annonceur voit la position live + un historique du trajet du jour.
- **Après** `end_date` → accès à un récapitulatif (trace GPS, km parcourus, zones traversées, heures actives) pendant 30 jours, puis purge RGPD.
- **Hors période** → aucun accès aux positions (le propriétaire reste maître de sa vie privée le reste du temps).

Ces règles seront portées par les policies RLS sur la future table `vehicle_positions`. Je les documente dans `.lovable/plan.md` pour quand on implémentera le tracking.

## Partie à construire maintenant : flux « Brief annonceur »

### 1. Base de données (1 migration)

**Enum** `brief_status` : `open`, `closed`, `fulfilled`, `cancelled`
**Enum** `proposal_status` : `pending`, `accepted`, `rejected`, `withdrawn`

**Table `advertiser_briefs`** :
- `id`, `advertiser_id` (→ auth.users), `title`, `description`
- `vehicle_types` (text[]) — types souhaités (food_truck, van, taxi, scooter, sac_a_dos_lcd, sac_a_dos_affiche, autre)
- `zones` (text[]), `start_date`, `end_date`, `days_count`
- `budget_max` (numeric, optionnel), `audience_target` (text)
- `creative_files` (text[]) — uploads bucket `campaign-creatives`
- `status` (brief_status, default `open`), `created_at`, `updated_at`

**Table `brief_proposals`** :
- `id`, `brief_id` (→ advertiser_briefs), `vehicle_id` (→ vehicles), `owner_id`
- `price_per_day` (numeric), `message` (text)
- `status` (proposal_status, default `pending`), `created_at`

**RLS** :
- `advertiser_briefs` : annonceur CRUD ses briefs ; propriétaires lisent ceux `open` dont le `vehicle_types` recoupe leurs véhicules approuvés ; admin tout.
- `brief_proposals` : propriétaire crée/lit/retire ses propositions ; annonceur propriétaire du brief lit/accepte/refuse ; admin tout.
- `GRANT` standards (`authenticated`, `service_role`).

**Trigger** : quand une proposition passe en `accepted` → créer automatiquement une `campaign_request` liée (statut soumis aux règles existantes `auto_validate_campaign_request`) et passer le brief en `fulfilled`.

### 2. Server functions (`src/lib/briefs.functions.ts`)

Toutes protégées par `requireSupabaseAuth`, validation Zod :
- `createBrief`, `listMyBriefs`, `cancelBrief` (annonceur)
- `listOpenBriefsForOwner` (propriétaires éligibles)
- `submitProposal`, `withdrawProposal` (propriétaire)
- `acceptProposal`, `rejectProposal` (annonceur)

### 3. Pages frontend

**Côté annonceur** :
- `/annonceur/briefs/nouveau` — formulaire (titre, types, zones, dates, budget optionnel, créa, audience)
- `/annonceur/briefs` — liste de mes briefs avec nb de propositions reçues
- `/annonceur/briefs/$briefId` — détail brief + liste des propositions (accepter/refuser)
- Ajouter bouton « + Nouveau brief » sur `/annonceur` à côté de « + Nouvelle campagne »

**Côté propriétaire** :
- Nouvel onglet « Briefs ouverts » sur `/proprietaire` listant les briefs compatibles avec mes véhicules approuvés
- `/proprietaire/briefs/$briefId` — détail + bouton « Proposer un véhicule » (choix du véhicule + prix + message)
- Section « Mes propositions » avec statut

### 4. Header

Ajouter dans le menu annonceur connecté : lien « Mes briefs ».

## Hors scope (pour plus tard)

- Tracking GPS temps réel (`vehicle_positions` + app mobile propriétaire + Realtime). Les règles d'accès annonceur ci-dessus seront appliquées à ce moment-là.
- Notifications email automatiques sur nouvelle proposition / acceptation (à brancher quand on activera les app emails sur ces événements).
- Paiement automatisé via Stripe à l'acceptation (déjà hors scope dans le plan global).
