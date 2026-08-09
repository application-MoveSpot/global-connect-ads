CREATE OR REPLACE FUNCTION public.protect_campaign_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE ALL ON FUNCTION public.protect_campaign_payment_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_campaign_payment_fields() FROM anon;
REVOKE ALL ON FUNCTION public.protect_campaign_payment_fields() FROM authenticated;