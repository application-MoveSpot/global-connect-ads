CREATE TYPE vehicle_type_new AS ENUM (
  'food_truck', 'van', 'taxi', 'scooter', 'voiture', 'autre',
  'velo_cargo', 'velo_remorque', 'triporteur', 'tutuk'
);

ALTER TABLE public.vehicles 
  ALTER COLUMN type TYPE vehicle_type_new 
  USING type::text::vehicle_type_new;

DROP TYPE vehicle_type;

ALTER TYPE vehicle_type_new RENAME TO vehicle_type;