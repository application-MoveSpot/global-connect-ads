import { useEffect } from "react";
import { getOrRefreshSession } from "@/integrations/supabase/session";

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;

export function SessionKeeper() {
  useEffect(() => {
    const check = () => { void getOrRefreshSession().catch(() => {}); };

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onOnline = () => check();
    const onFocus = () => check();

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
