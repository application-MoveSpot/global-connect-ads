DROP POLICY IF EXISTS "Drivers update own control requests" ON public.control_photo_requests;
CREATE POLICY "Drivers update own control requests" ON public.control_photo_requests
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = control_photo_requests.driver_id AND d.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = control_photo_requests.driver_id AND d.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_control_photo_admin_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id
     OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
     OR NEW.campaign_request_id IS DISTINCT FROM OLD.campaign_request_id
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.deadline_at IS DISTINCT FROM OLD.deadline_at
     OR NEW.admin_validated IS DISTINCT FROM OLD.admin_validated
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.fraud_flags IS DISTINCT FROM OLD.fraud_flags THEN
    RAISE EXCEPTION 'Modification non autorisée';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_control_photo_admin_fields ON public.control_photo_requests;
CREATE TRIGGER protect_control_photo_admin_fields BEFORE UPDATE ON public.control_photo_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_control_photo_admin_fields();

DROP POLICY IF EXISTS "Recipients can mark read" ON public.messages;
CREATE POLICY "Recipients can mark read" ON public.messages
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.advertiser_briefs b WHERE b.id = messages.brief_id AND b.advertiser_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.brief_proposals p JOIN public.owner_profiles o ON o.id = p.owner_id WHERE p.id = messages.proposal_id AND o.user_id = auth.uid()))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.advertiser_briefs b WHERE b.id = messages.brief_id AND b.advertiser_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.brief_proposals p JOIN public.owner_profiles o ON o.id = p.owner_id WHERE p.id = messages.proposal_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.messages_only_read_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.body IS DISTINCT FROM OLD.body OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.sender_role IS DISTINCT FROM OLD.sender_role OR NEW.brief_id IS DISTINCT FROM OLD.brief_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Seul le statut de lecture peut être modifié';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_only_read_at ON public.messages;
CREATE TRIGGER messages_only_read_at BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_only_read_at();