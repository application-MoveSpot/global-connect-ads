-- Ajout des colonnes de statut Stripe sur les profils propriétaires
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due TEXT[] DEFAULT '{}'::TEXT[];

COMMENT ON COLUMN public.owner_profiles.stripe_requirements_due
  IS 'Liste des champs manquants requis par Stripe pour débloquer les virements';
