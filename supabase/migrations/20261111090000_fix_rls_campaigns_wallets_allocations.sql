-- =============================================================================
-- Migration : RLS sur campaigns, advertiser_wallets, campaign_allocations
--
-- Audit pré-lancement : ces 3 tables n'avaient aucune Row Level Security.
-- Sans RLS, tout utilisateur authentifié peut lire et écrire toutes les lignes
-- via l'API REST Supabase (PostgREST), indépendamment du propriétaire.
--
-- Choix de conception :
--   - campaigns          : annonceur propriétaire + admin + service_role
--   - advertiser_wallets : SELECT uniquement pour authenticated (solde en lecture
--                          seule) ; toutes modifications via SECURITY DEFINER ou
--                          service_role pour empêcher l'altération directe du solde
--   - campaign_allocations : table de liaison sans user_id direct ; accès via
--                            JOIN annonceur/propriétaire + admin + service_role
-- =============================================================================

-- ── 1. campaigns ──────────────────────────────────────────────────────────────
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Annonceur : lecture et gestion de ses propres campagnes
CREATE POLICY "campaigns_own_select"
  ON public.campaigns FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);

CREATE POLICY "campaigns_own_insert"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = advertiser_id);

CREATE POLICY "campaigns_own_update"
  ON public.campaigns FOR UPDATE TO authenticated
  USING  (auth.uid() = advertiser_id)
  WITH CHECK (auth.uid() = advertiser_id);

-- Admin : accès complet (lecture, modification, suppression)
CREATE POLICY "campaigns_admin_all"
  ON public.campaigns FOR ALL TO authenticated
  USING  (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- service_role : accès complet (webhooks, cron, SECURITY DEFINER)
CREATE POLICY "campaigns_service_all"
  ON public.campaigns FOR ALL TO service_role
  USING  (true)
  WITH CHECK (true);

-- ── 2. advertiser_wallets ──────────────────────────────────────────────────────
-- IMPORTANT : aucune policy UPDATE/INSERT/DELETE pour `authenticated`.
-- Toutes les mutations du solde passent exclusivement par des fonctions
-- SECURITY DEFINER (ex. process_campaign_wallet_payment) ou service_role
-- (webhooks Stripe) afin d'empêcher toute altération directe via l'API REST.
ALTER TABLE public.advertiser_wallets ENABLE ROW LEVEL SECURITY;

-- Annonceur : lecture de son propre solde
CREATE POLICY "advertiser_wallets_own_select"
  ON public.advertiser_wallets FOR SELECT TO authenticated
  USING (auth.uid() = advertiser_id);

-- Admin : lecture complète de tous les portefeuilles
CREATE POLICY "advertiser_wallets_admin_select"
  ON public.advertiser_wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- service_role : accès complet (webhooks Stripe, créditement post-paiement)
CREATE POLICY "advertiser_wallets_service_all"
  ON public.advertiser_wallets FOR ALL TO service_role
  USING  (true)
  WITH CHECK (true);

-- ── 3. campaign_allocations ────────────────────────────────────────────────────
-- Table de liaison campaigns ↔ vehicles. Pas de user_id direct.
-- Lecture filtrée via sous-requête sur le propriétaire de la campagne ou du véhicule.
-- INSERT/UPDATE/DELETE réservés à service_role (créés uniquement par la logique métier).
ALTER TABLE public.campaign_allocations ENABLE ROW LEVEL SECURITY;

-- Annonceur : voit les allocations de ses propres campagnes
CREATE POLICY "campaign_allocations_advertiser_select"
  ON public.campaign_allocations FOR SELECT TO authenticated
  USING (
    auth.uid() = (
      SELECT advertiser_id FROM public.campaigns WHERE id = campaign_id
    )
  );

-- Propriétaire de flotte : voit les allocations de ses véhicules
CREATE POLICY "campaign_allocations_owner_select"
  ON public.campaign_allocations FOR SELECT TO authenticated
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.vehicles WHERE id = vehicle_id
    )
  );

-- Admin : lecture complète
CREATE POLICY "campaign_allocations_admin_select"
  ON public.campaign_allocations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- service_role : accès complet
CREATE POLICY "campaign_allocations_service_all"
  ON public.campaign_allocations FOR ALL TO service_role
  USING  (true)
  WITH CHECK (true);
