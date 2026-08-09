-- 1) Protect payment/payout columns on campaign_requests from non-service updates
CREATE OR REPLACE FUNCTION public.protect_campaign_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  NEW.payment_status := OLD.payment_status;
  NEW.paid_at := OLD.paid_at;
  NEW.paid_amount_cents := OLD.paid_amount_cents;
  NEW.owner_amount_cents := OLD.owner_amount_cents;
  NEW.platform_fee_cents := OLD.platform_fee_cents;
  NEW.payout_status := OLD.payout_status;
  NEW.stripe_transfer_id := OLD.stripe_transfer_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_campaign_payment_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_campaign_payment_fields_trg ON public.campaign_requests;
CREATE TRIGGER protect_campaign_payment_fields_trg
BEFORE UPDATE ON public.campaign_requests
FOR EACH ROW EXECUTE FUNCTION public.protect_campaign_payment_fields();

-- 2) Lock down role assignment on user_roles
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

DROP POLICY IF EXISTS "No client role inserts" ON public.user_roles;
CREATE POLICY "No client role inserts"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client role updates" ON public.user_roles;
CREATE POLICY "No client role updates"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (false);

DROP POLICY IF EXISTS "No client role deletes" ON public.user_roles;
CREATE POLICY "No client role deletes"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (false);