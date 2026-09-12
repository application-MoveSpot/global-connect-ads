-- Ajout des champs d'identification physique du véhicule
-- Permet au poseur d'identifier le bon véhicule sur le terrain

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS license_plate text,
  ADD COLUMN IF NOT EXISTS brand        text,
  ADD COLUMN IF NOT EXISTS model        text,
  ADD COLUMN IF NOT EXISTS color        text;

COMMENT ON COLUMN public.vehicles.license_plate IS 'Plaque d''immatriculation (ex: AB-123-CD)';
COMMENT ON COLUMN public.vehicles.brand          IS 'Marque du véhicule (ex: Renault, Peugeot)';
COMMENT ON COLUMN public.vehicles.model          IS 'Modèle du véhicule (ex: Master, Transit)';
COMMENT ON COLUMN public.vehicles.color          IS 'Couleur principale du véhicule (ex: blanc, noir)';

-- Lien optionnel d'une demande de devis prestataire vers un véhicule précis
-- Permet d'afficher la fiche d'identification dans la mission du poseur
ALTER TABLE public.service_quotes
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
