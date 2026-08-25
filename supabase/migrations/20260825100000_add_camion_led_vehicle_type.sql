-- Ajoute le type "camion_led" (Fourgon publicitaire numérique LED 3 faces)
-- à l'enum vehicle_type utilisé par les tables vehicles et advertiser_briefs.
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'camion_led';
