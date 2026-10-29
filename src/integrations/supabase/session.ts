import { supabase } from "./client";
import type { Session } from "@supabase/supabase-js";

// Deduplicates concurrent calls so only one refreshSession() runs at a time.
// Prevents the Web Locks "steal" AbortError when multiple components call
// getOrRefreshSession() simultaneously (e.g. React Strict Mode double-invoke).
let _pendingSession: Promise<Session | null> | null = null;

export async function getOrRefreshSession(): Promise<Session | null> {
  if (_pendingSession) return _pendingSession;

  _pendingSession = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) return null;

      const expiresAt = session.expires_at;
      if (!session.access_token || (expiresAt && expiresAt * 1000 < Date.now() + 30_000)) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          return refreshed.session ?? session ?? null;
        } catch {
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
