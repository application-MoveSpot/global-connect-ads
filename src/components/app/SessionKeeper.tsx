import { useEffect } from "react";
import { getOrRefreshSession } from "@/integrations/supabase/session";

export function SessionKeeper() {
  useEffect(() => {
    const check = () => { void getOrRefreshSession().catch(() => {}); };

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onOnline = () => check();
    const onFocus = () => check();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);

    check();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
