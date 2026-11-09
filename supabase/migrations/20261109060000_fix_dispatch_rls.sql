-- Fix mission dispatch workflow: allow poseurs to see and accept dispatched missions
-- Problem: RLS policy "poseur lit ses propres missions" uses payee_user_id = auth.uid()
--          but dispatched missions have payee_user_id IS NULL → poseurs can never see them
-- Solution:
--   1. New SELECT policy for dispatched missions via mission_dispatch_log
--   2. Composite index for efficient lookups
--   3. Atomic accept function with pessimistic lock (race-condition safe)

-- ── 1. New RLS policy: poseur sees dispatched missions where they're invited ──────────────
CREATE POLICY "poseur voit missions dispatched le concernant"
  ON public.installation_missions
  FOR SELECT
  TO authenticated
  USING (
    status = 'dispatched'
    AND EXISTS (
      SELECT 1 FROM public.mission_dispatch_log dl
      WHERE dl.mission_id = installation_missions.id
        AND dl.payee_user_id = auth.uid()
        AND dl.response = 'pending'
    )
  );

-- ── 2. Composite index for efficient dispatch log lookups ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mission_dispatch_log_avail
  ON public.mission_dispatch_log (payee_user_id, response, mission_id);

-- ── 3. Atomic accept function ─────────────────────────────────────────────────────────────
-- Uses pessimistic row-level lock to prevent two poseurs accepting simultaneously.
-- Returns JSONB: { ok: true, mission: {...} } or { ok: false, reason: '...' }
CREATE OR REPLACE FUNCTION public.accept_dispatched_mission(
  p_mission_id    UUID,
  p_installer_uid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission   installation_missions%ROWTYPE;
  v_log_row   mission_dispatch_log%ROWTYPE;
BEGIN
  -- Lock the mission row to prevent concurrent accepts
  SELECT * INTO v_mission
  FROM public.installation_missions
  WHERE id = p_mission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found');
  END IF;

  IF v_mission.status <> 'dispatched' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_taken', 'status', v_mission.status);
  END IF;

  -- Verify installer was invited
  SELECT * INTO v_log_row
  FROM public.mission_dispatch_log
  WHERE mission_id = p_mission_id
    AND payee_user_id = p_installer_uid
    AND response = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_invited');
  END IF;

  -- Assign mission to this installer
  UPDATE public.installation_missions
  SET
    status          = 'assigned',
    payee_user_id   = p_installer_uid,
    updated_at      = now()
  WHERE id = p_mission_id;

  -- Mark this installer's dispatch log entry as accepted
  UPDATE public.mission_dispatch_log
  SET response = 'accepted'
  WHERE mission_id = p_mission_id
    AND payee_user_id = p_installer_uid;

  -- Expire all other pending candidates
  UPDATE public.mission_dispatch_log
  SET response = 'expired'
  WHERE mission_id = p_mission_id
    AND payee_user_id <> p_installer_uid
    AND response = 'pending';

  RETURN jsonb_build_object(
    'ok',         true,
    'mission_id', p_mission_id,
    'assigned_to', p_installer_uid
  );
END;
$$;

-- Grant execute to authenticated users (the EF uses service_role, but defence-in-depth)
GRANT EXECUTE ON FUNCTION public.accept_dispatched_mission(UUID, UUID) TO authenticated;
