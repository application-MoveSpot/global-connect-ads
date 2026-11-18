-- Ajoute la colonne country_code à owner_profiles.
-- Utilisée par le formulaire d'inscription propriétaire (étape 2 Profil)
-- pour stocker le pays d'activité (FR, BE, LU, DE).
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS country_code text;
