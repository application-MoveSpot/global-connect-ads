import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

/**
 * Returns the current session, refreshing it first if the access token is
 * absent or expires within 30 seconds.  Use this instead of
 * supabase.auth.getSession() in component effects so mobile tabs that were
 * suspended (and whose autoRefreshToken timer couldn't run) still get a valid
 * session rather than being incorrectly treated as logged-out.
 */
export async function getOrRefreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const expiresAt = session?.expires_at;

  if (!session?.access_token || (expiresAt && expiresAt * 1000 < Date.now() + 30_000)) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session ?? null;
  }

  return session;
}
