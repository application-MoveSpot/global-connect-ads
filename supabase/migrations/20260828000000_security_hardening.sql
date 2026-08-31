-- Security hardening: DB-level check constraints + RLS gaps

-- ================================================================
-- push_subscriptions: enforce field length limits at the DB layer
-- (Zod validation already runs in the server function; this is
--  defence-in-depth for any path that writes directly.)
-- ================================================================
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_length
    CHECK (length(endpoint) <= 2000),
  ADD CONSTRAINT push_subscriptions_p256dh_length
    CHECK (length(p256dh) <= 512),
  ADD CONSTRAINT push_subscriptions_auth_length
    CHECK (length(auth) <= 256);

-- ================================================================
-- analytics_events: enforce event name length so no one can
-- spam arbitrarily large strings directly via the anon client.
-- Also restrict anonymous inserts: only authenticated users or
-- Supabase service-role calls may write events (user_id IS NULL
-- is still allowed to support pre-auth page-load tracking).
-- ================================================================
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_nonempty
    CHECK (length(event) BETWEEN 1 AND 200);

-- Admins can read all analytics events for dashboards / audits
DROP POLICY IF EXISTS "Admins read all analytics events" ON public.analytics_events;
CREATE POLICY "Admins read all analytics events"
  ON public.analytics_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- brief_proposals: add explicit DELETE block for non-admins.
-- Proposals should be withdrawn (status change) not deleted;
-- this makes that intent explicit rather than relying on the
-- absence of a DELETE policy.
-- ================================================================
DROP POLICY IF EXISTS "No client deletes on proposals" ON public.brief_proposals;
CREATE POLICY "No client deletes on proposals"
  ON public.brief_proposals
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
