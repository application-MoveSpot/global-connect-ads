import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Refresh the access token if it expires within 3 minutes.
// Supabase's autoRefreshToken handles the normal case but relies on
// setInterval, which browsers throttle or pause when a tab is hidden,
// when the device sleeps, or when the network is cut. This component
// covers those gaps by refreshing on every re-activation event.
const MARGIN_MS = 3 * 60 * 1000;

async function refreshIfNeeded() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt - Date.now() < MARGIN_MS) {
      await supabase.auth.refreshSession();
    }
  } catch {
    /* network error — will retry on next activation event */
  }
}

export function SessionKeeper() {
  useEffect(() => {
    // Tab becomes visible again (covers suspend / sleep / background)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshIfNeeded();
    };

    // Network restored after going offline
    const onOnline = () => void refreshIfNeeded();

    // Window re-focused (alt-tab, click on another app then back)
    const onFocus = () => void refreshIfNeeded();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);

    // Check on mount: covers a page reload after the device was asleep
    void refreshIfNeeded();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
