-- =============================================================================
-- Migration : lecture publique intentionnelle des tables de multiplicateurs
-- =============================================================================
-- CONTEXTE
--   pricing_zone_multipliers     : coefficients par zone géographique (ex : 1.50 Paris)
--   pricing_seasonal_multipliers : coefficients saisonniers / événementiels (ex : 1.25 JO)
--
-- Ces deux tables ne contiennent AUCUNE donnée personnelle (pas de nom, e-mail,
-- téléphone, SIRET, ni aucun identifiant utilisateur).
--
-- Le simulateur d'impact et de devis affiché sur la page d'accueil move-spot.com
-- doit pouvoir lire ces grilles AVANT toute inscription (visiteur anonyme / rôle anon).
-- Restreindre la lecture à auth.uid() ferait afficher 0 € ou une erreur aux prospects.
--
-- DÉCISION ARCHITECTURALE (validée par l'équipe MoveSpot) :
--   SELECT sur ces deux tables = accès PUBLIC (anon + authenticated).
--   Toute future révision de sécurité NE DOIT PAS ajouter de prédicat auth.uid()
--   sur ces politiques de lecture.
-- =============================================================================

-- 1. Supprimer les anciennes politiques de lecture (TO authenticated seulement)
--    créées dans 20261110060000_pricing_multipliers.sql
DROP POLICY IF EXISTS "pricing_zone_read"     ON public.pricing_zone_multipliers;
DROP POLICY IF EXISTS "pricing_seasonal_read" ON public.pricing_seasonal_multipliers;

-- 2. Recréer les politiques avec accès anon + authenticated (visiteurs non connectés inclus)
CREATE POLICY "pricing_zone_public_read"
    ON public.pricing_zone_multipliers
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "pricing_seasonal_public_read"
    ON public.pricing_seasonal_multipliers
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3. Documenter les politiques pour les audits automatiques (Lovable, Supabase advisor, etc.)
--    COMMENT ON POLICY est lisible via pg_policies et détecté par les outils d'audit RLS.

COMMENT ON POLICY "pricing_zone_public_read"
    ON public.pricing_zone_multipliers
    IS 'INTENTIONAL PUBLIC READ — Coefficients tarifaires géographiques (zone dense, etc.). '
       'Aucune donnée personnelle dans cette table. '
       'Accès anonyme (rôle anon) REQUIS pour le simulateur de budget move-spot.com '
       '(calculateur de coût campagne affiché avant inscription). '
       'Ne jamais restreindre à auth.uid() — cela casse le calculateur pour les prospects.';

COMMENT ON POLICY "pricing_seasonal_public_read"
    ON public.pricing_seasonal_multipliers
    IS 'INTENTIONAL PUBLIC READ — Grilles saisonnières et événementielles (Noël, JO, Été, etc.). '
       'Aucune donnée personnelle dans cette table. '
       'Accès anonyme (rôle anon) REQUIS pour le simulateur de budget move-spot.com '
       '(calculateur de coût campagne affiché avant inscription). '
       'Ne jamais restreindre à auth.uid() — cela casse le calculateur pour les prospects.';

-- 4. Vérification : les politiques doivent apparaître dans pg_policies avec cmd = 'r' et roles ⊇ {anon}
-- SELECT policyname, cmd, roles, qual
-- FROM   pg_policies
-- WHERE  tablename IN ('pricing_zone_multipliers', 'pricing_seasonal_multipliers')
-- ORDER  BY tablename, policyname;
