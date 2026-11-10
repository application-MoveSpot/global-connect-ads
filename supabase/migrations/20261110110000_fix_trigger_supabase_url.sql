-- ALTER DATABASE SET n'est pas autorisé sur Supabase (rôle non-superuser).
-- L'URL du projet n'étant pas un secret, on la définit directement dans la fonction.
CREATE OR REPLACE FUNCTION public.on_wallet_campaign_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_advertiser_email TEXT;
    v_service_role_key TEXT;
BEGIN
    IF NEW.type = 'campaign_payment' THEN
        SELECT email INTO v_advertiser_email
        FROM auth.users
        WHERE id = NEW.advertiser_id;

        SELECT decrypted_secret INTO v_service_role_key
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key';

        PERFORM net.http_post(
            url     := 'https://kbloaebbwgzudtkrvulp.supabase.co/functions/v1/send-campaign-receipt',
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
