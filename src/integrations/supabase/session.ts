import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

// Deduplicates concurrent calls so only one refreshSession() runs at a time.
// Prevents the Web Locks "steal" AbortError when multiple components call
// getOrRefreshSession() simultaneously (e.g. React Strict Mode double-invoke).
let _pendingSession: Promise<Session | null> | null = null;

/**
 * Returns the current session, refreshing it first if the access token is
 * absent or expires within 30 seconds.  Use this instead of
 * supabase.auth.getSession() in component effects so mobile tabs that were
 * suspended (and whose autoRefreshToken timer couldn't run) still get a valid
 * session rather than being incorrectly treated as logged-out.
 */
export async function getOrRefreshSession(): Promise<Session | null> {
  if (_pendingSession) return _pendingSession;

  _pendingSession = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // No session at all — return null immediately, no point refreshing.
      if (!session) return null;

      const expiresAt = session.expires_at;
      if (!session.access_token || (expiresAt && expiresAt * 1000 < Date.now() + 30_000)) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          return refreshed.session ?? session ?? null;
        } catch {
          // AbortError or network error — return the current session and let
          // the server validate; better than crashing the page.
          return session ?? null;
        }
      }

      return session;
    } finally {
      _pendingSession = null;
    }
  })();

  return _pendingSession;
}

/**
 * Forces a token refresh regardless of expiry.  Routes through the same
 * deduplication lock as getOrRefreshSession() so concurrent callers (e.g.
 * BetaGuard retrying after a stale-JWT RPC failure) never race on the Web Lock.
 */
export async function forceRefreshSession(): Promise<Session | null> {
  if (_pendingSession) return _pendingSession;

  _pendingSession = (async () => {
    try {
      const { data } = await supabase.auth.refreshSession();
      return data.session ?? null;
    } catch {
      return null;
    } finally {
      _pendingSession = null;
    }
  })();

  return _pendingSession;
}
