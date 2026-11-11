-- =============================================================================
-- Migration : RPC retry_bank_transfer
-- Remet une ligne bank_transfer_requests de failed → pending
-- et déclenche immédiatement trigger_bank_transfers_processing() via pg_net
-- =============================================================================

CREATE OR REPLACE FUNCTION public.retry_bank_transfer(request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.bank_transfer_requests
    SET status         = 'pending',
        failure_reason = NULL,
        updated_at     = NOW()
    WHERE id = request_id
      AND status = 'failed';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ligne % introuvable ou statut différent de failed', request_id;
    END IF;

    -- Déclencher immédiatement l'Edge Function via pg_net
    PERFORM public.trigger_bank_transfers_processing();

    RETURN jsonb_build_object('success', true, 'retried_id', request_id);
END;
$$;

-- Accessible aux admins authentifiés
GRANT EXECUTE ON FUNCTION public.retry_bank_transfer(uuid) TO authenticated;
