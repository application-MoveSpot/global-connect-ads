CREATE OR REPLACE FUNCTION public.on_wallet_campaign_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_advertiser_email TEXT;
    v_service_role_key TEXT;
    v_supabase_url     TEXT;
BEGIN
    IF NEW.type = 'campaign_payment' THEN
        -- Email via auth.users (toujours fiable, indépendant des tables de profil)
        SELECT email INTO v_advertiser_email
        FROM auth.users
        WHERE id = NEW.advertiser_id;

        -- Clé service_role depuis Supabase Vault
        SELECT decrypted_secret INTO v_service_role_key
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key';

        -- URL du projet (à définir via : ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co')
        v_supabase_url := current_setting('app.supabase_url', true);

        PERFORM net.http_post(
            url     := v_supabase_url || '/functions/v1/send-campaign-receipt',
            headers := jsonb_build_object(
                'Content-Type',  'application/json',
                'Authorization', 'Bearer ' || v_service_role_key
            ),
            body    := jsonb_build_object(
                'transaction_id', NEW.id,
                'email',          v_advertiser_email,
                'amount',         ABS(NEW.amount),
                'description',    NEW.description
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_wallet_campaign_payment
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.on_wallet_campaign_payment();
