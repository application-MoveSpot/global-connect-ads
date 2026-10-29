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
      const expiresAt = session?.expires_at;

      if (!session?.access_token || (expiresAt && expiresAt * 1000 < Date.now() + 30_000)) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        // Fall back to the current session if refresh fails (server will validate)
        return refreshed.session ?? session ?? null;
      }

      return session;
    } finally {
      _pendingSession = null;
    }
  })();

  return _pendingSession;
}
