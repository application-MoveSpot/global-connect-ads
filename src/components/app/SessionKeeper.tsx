import { useEffect } from "react";
import { getOrRefreshSession } from "@/integrations/supabase/session";

// Supabase autoRefreshToken is disabled on the client (client.ts) so the SDK's
// internal timer doesn't compete with getOrRefreshSession() on the Web Lock.
// This component owns all proactive token refreshes.
const REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 min — tokens expire in 1 h

export function SessionKeeper() {
  useEffect(() => {
    const check = () => { void getOrRefreshSession().catch(() => {}); };

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onOnline = () => check();
    const onFocus = () => check();

    // Periodic refresh so idle-but-visible tabs don't expire.
    const timer = setInterval(check, REFRESH_INTERVAL_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);

    check();

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
