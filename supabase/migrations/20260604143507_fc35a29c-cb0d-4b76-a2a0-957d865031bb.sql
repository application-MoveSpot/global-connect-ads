CREATE TYPE public.vehicle_condition AS ENUM ('excellent', 'bon', 'moyen', 'mauvais');

ALTER TABLE public.vehicles ADD COLUMN condition public.vehicle_condition;
ALTER TABLE public.vehicles ADD COLUMN ai_verification jsonb;

CREATE OR REPLACE FUNCTION public.auto_reject_bad_condition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.condition = 'mauvais' THEN
    NEW.status := 'rejected';
    NEW.admin_notes := COALESCE(NEW.admin_notes || E'\n', '') || '⛔ Refus automatique — Véhicule déclaré en mauvais état. Les véhicules en mauvais état ne sont pas acceptés sur MoveSpot.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vehicles_auto_reject_bad_condition ON public.vehicles;
CREATE TRIGGER vehicles_auto_reject_bad_condition
BEFORE INSERT OR UPDATE OF condition ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.auto_reject_bad_condition();