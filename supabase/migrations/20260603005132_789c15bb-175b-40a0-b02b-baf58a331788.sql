
CREATE OR REPLACE FUNCTION public.auto_validate_campaign_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_conflict_count INT;
  v_motif TEXT;
BEGIN
  -- Only run on initial insert when status is pending (default)
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Rule 1: vehicle must be linked
  IF NEW.vehicle_id IS NULL THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := '⛔ Refus automatique — Aucun véhicule associé à la demande.';
    RETURN NEW;
  END IF;

  -- Rule 2: vehicle must exist and be approved
  SELECT status INTO v_status FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_status IS NULL THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := '⛔ Refus automatique — Le véhicule demandé n''existe plus.';
    RETURN NEW;
  END IF;
  IF v_status <> 'approved' THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := format('⛔ Refus automatique — Le véhicule n''est pas approuvé (statut actuel : %s).', v_status);
    RETURN NEW;
  END IF;

  -- Rule 3: dates required and coherent
  IF NEW.start_date IS NULL OR NEW.end_date IS NULL THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := '⛔ Refus automatique — Dates de campagne manquantes.';
    RETURN NEW;
  END IF;
  IF NEW.end_date < NEW.start_date THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := '⛔ Refus automatique — La date de fin est antérieure à la date de début.';
    RETURN NEW;
  END IF;
  IF NEW.start_date < CURRENT_DATE THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := '⛔ Refus automatique — La date de début est déjà passée.';
    RETURN NEW;
  END IF;

  -- Rule 4: no overlap with an existing accepted/approved booking on the same vehicle
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.campaign_requests
  WHERE vehicle_id = NEW.vehicle_id
    AND status = 'approved'
    AND start_date IS NOT NULL
    AND end_date IS NOT NULL
    AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]');

  IF v_conflict_count > 0 THEN
    NEW.status := 'rejected';
    NEW.owner_response := 'rejected';
    NEW.admin_notes := format('⛔ Refus automatique — Le véhicule est déjà réservé sur la période du %s au %s.',
      to_char(NEW.start_date, 'DD/MM/YYYY'), to_char(NEW.end_date, 'DD/MM/YYYY'));
    RETURN NEW;
  END IF;

  -- All checks passed → auto-approve
  v_motif := format(
    '✅ Validation automatique — Véhicule approuvé, dates libres du %s au %s (%s jour(s)), montant %s €.',
    to_char(NEW.start_date, 'DD/MM/YYYY'),
    to_char(NEW.end_date, 'DD/MM/YYYY'),
    COALESCE(NEW.days_count, (NEW.end_date - NEW.start_date + 1)),
    COALESCE(NEW.total_price::text, 'non précisé')
  );
  NEW.status := 'approved';
  NEW.owner_response := 'approved';
  NEW.admin_notes := v_motif;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_validate_campaign_request ON public.campaign_requests;
CREATE TRIGGER trg_auto_validate_campaign_request
BEFORE INSERT ON public.campaign_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_validate_campaign_request();
