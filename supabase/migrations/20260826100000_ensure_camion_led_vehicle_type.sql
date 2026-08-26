-- Garantit la présence de 'camion_led' dans l'enum vehicle_type.
-- Idempotente (IF NOT EXISTS) — sans effet si la valeur existe déjà.
ALTER TYPE public.vehicle_type ADD VALUE IF NOT EXISTS 'camion_led';
