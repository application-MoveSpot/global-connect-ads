-- Colonnes manquantes dans advertiser_profiles détectées lors de l'inscription.
-- cgu_accepted_at / cgu_version : déjà dans 20260824120000 mais non appliquées.
-- commercial_id : identifiant commercial attribué à l'annonceur.
-- referred_by_advertiser_id : parrainage entre annonceurs.

ALTER TABLE public.advertiser_profiles
  ADD COLUMN IF NOT EXISTS cgu_version             text,
  ADD COLUMN IF NOT EXISTS cgu_accepted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS commercial_id           text,
  ADD COLUMN IF NOT EXISTS referred_by_advertiser_id uuid
    REFERENCES public.advertiser_profiles(id) ON DELETE SET NULL;
