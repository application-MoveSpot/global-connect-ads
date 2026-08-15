-- =========================================================
-- Correction complète des 6 avertissements de sécurité
-- restants signalés par le linter Supabase.
-- =========================================================


-- =========================================================
-- 1. SECURITY DEFINER : has_role — prévenir l'énumération
--    de rôles inter-utilisateurs.
--    Un utilisateur connecté ne peut interroger que son
--    propre UUID ou appeler depuis service_role/postgres.
-- =========================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  SELECT CASE
    WHEN _user_id = auth.uid()
      OR current_setting('role', true) = 'service_role'
      OR session_user = 'postgres'
    THEN
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      )
    ELSE false
  END;
$$;

-- Maintenir le GRANT strictement à authenticated (pas anon)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;


-- =========================================================
-- 2. campaign_requests : masquer les jetons Stripe internes
--    et la commission plateforme aux propriétaires.
--    Utilise information_schema pour éviter de coder en dur
--    la liste de colonnes (robuste aux futures migrations).
-- =========================================================

DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'campaign_requests'
    AND column_name NOT IN (
      'stripe_checkout_session_id',
      'stripe_payment_intent_id',
      'stripe_transfer_id',
      'stripe_subscription_id',
      'subscription_customer_id',
      'platform_fee_cents',
      'payout_transferred_at',
      'owner_transferred_at'
    );

  IF v_cols IS NULL THEN
    RAISE NOTICE 'campaign_requests : aucune colonne trouvée, skip.';
    RETURN;
  END IF;

  -- Révoque l'accès table-niveau (le REVOKE est idempotent)
  EXECUTE 'REVOKE SELECT ON public.campaign_requests FROM authenticated';
  -- Re-octroie uniquement les colonnes sûres
  EXECUTE format(
    'GRANT SELECT (%s) ON public.campaign_requests TO authenticated',
    v_cols
  );
END;
$$;


-- =========================================================
-- 3. provider_profiles : restreindre admin_notes aux admins
--    Les autres colonnes (email, phone, siret) restent
--    accessibles — nécessaires pour un annuaire B2B.
-- =========================================================

-- Révoquer le SELECT table-niveau (evite que admin_notes
-- soit lisible via la politique générale)
REVOKE SELECT ON public.provider_profiles FROM anon, authenticated;

-- Re-octroyer les colonnes publiques à authenticated
GRANT SELECT (
  user_id, company, siret, full_name, email, phone,
  website, description, services, coverage_areas,
  portfolio_urls, pricing_info, logo_url,
  status, created_at, updated_at
) ON public.provider_profiles TO authenticated;

-- admin_notes exclu : uniquement accessible via service_role
-- (le panneau admin utilise supabaseAdmin qui bypasse ce GRANT)


-- =========================================================
-- 4. vehicle_positions : corriger la jointure propriétaire
--    owner_id dans vehicles est une FK vers owner_profiles.id
--    (UUID interne), PAS vers auth.users.id.
--    La comparaison auth.uid() = v.owner_id était toujours
--    fausse → les propriétaires ne pouvaient ni insérer ni
--    lire leurs positions via l'API (le code utilise
--    service_role pour les écritures, mais le SELECT côté
--    tracking route était cassé).
-- =========================================================

DROP POLICY IF EXISTS "Owners can insert positions for own vehicles"
  ON public.vehicle_positions;

CREATE POLICY "Owners can insert positions for own vehicles"
  ON public.vehicle_positions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id
        AND op.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can view positions of own vehicles"
  ON public.vehicle_positions;

CREATE POLICY "Owners can view positions of own vehicles"
  ON public.vehicle_positions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vehicles v
      JOIN public.owner_profiles op ON op.id = v.owner_id
      WHERE v.id = vehicle_id
        AND op.user_id = auth.uid()
    )
  );


-- =========================================================
-- 5. Wallets / wallet_transactions / refunds
--    Ajouter TO authenticated sur toutes les politiques
--    manquantes (le linter Supabase exige un rôle explicite).
-- =========================================================

-- wallets
DROP POLICY IF EXISTS "users see own wallet" ON public.wallets;
CREATE POLICY "users see own wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins see all wallets" ON public.wallets;
CREATE POLICY "admins see all wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- wallet_transactions
DROP POLICY IF EXISTS "users see own wallet transactions"
  ON public.wallet_transactions;
CREATE POLICY "users see own wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins see all wallet transactions"
  ON public.wallet_transactions;
CREATE POLICY "admins see all wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- refunds
DROP POLICY IF EXISTS "users see own refunds" ON public.refunds;
CREATE POLICY "users see own refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage refunds" ON public.refunds;
CREATE POLICY "admins manage refunds"
  ON public.refunds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- =========================================================
-- 6. advertiser_profiles / owner_profiles
--    Ajouter TO authenticated sur toutes les politiques
--    manquantes.
-- =========================================================

-- advertiser_profiles
DROP POLICY IF EXISTS "Advertisers can view own profile"
  ON public.advertiser_profiles;
CREATE POLICY "Advertisers can view own profile"
  ON public.advertiser_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can insert own profile"
  ON public.advertiser_profiles;
CREATE POLICY "Advertisers can insert own profile"
  ON public.advertiser_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can update own profile"
  ON public.advertiser_profiles;
CREATE POLICY "Advertisers can update own profile"
  ON public.advertiser_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all advertiser profiles"
  ON public.advertiser_profiles;
CREATE POLICY "Admins can view all advertiser profiles"
  ON public.advertiser_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- owner_profiles
DROP POLICY IF EXISTS "Owners can view own profile" ON public.owner_profiles;
CREATE POLICY "Owners can view own profile"
  ON public.owner_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert own profile" ON public.owner_profiles;
CREATE POLICY "Owners can insert own profile"
  ON public.owner_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update own profile" ON public.owner_profiles;
CREATE POLICY "Owners can update own profile"
  ON public.owner_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all owner profiles"
  ON public.owner_profiles;
CREATE POLICY "Admins can view all owner profiles"
  ON public.owner_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
