import { useEffect } from "react";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_CONSENT_KEY } from "@/routes/auth";

const RELOAD_FLAG = "movespot:update-reload";

function isChunkError(message: string) {
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError|error loading dynamically/i.test(
    message,
  );
}

/**
 * Évite que les mises à jour de l'application déconnectent ou bloquent
 * les utilisateurs :
 * - un nouveau déploiement invalide les anciens chunks JS -> rechargement
 *   silencieux une seule fois (la session Supabase reste en localStorage) ;
 * - au retour d'onglet, on rafraîchit le token pour ne pas expirer.
 */
export function AppUpdateGuard() {
  useEffect(() => {
    const softReload = () => {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    };

    // La session est valide : on peut nettoyer le garde-fou anti-boucle.
    const clearFlag = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 10000);

    const onPreloadError = (e: Event) => {
      e.preventDefault();
      softReload();
    };
    const onError = (e: ErrorEvent) => {
      if (e.message && isChunkError(e.message)) softReload();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = typeof e.reason === "string" ? e.reason : (e.reason?.message ?? "");
      if (msg && isChunkError(msg)) softReload();
    };

    // Persist pending consent stored before an OAuth redirect
    void getOrRefreshSession().then(async (session) => {
      if (!session) return;
      let raw: string | null = null;
      try { raw = localStorage.getItem(PENDING_CONSENT_KEY); } catch { return; }
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as {
          terms_accepted_at: string;
          privacy_accepted_at: string;
          marketing_consent: boolean;
          marketing_consent_at: string | null;
        };
        await supabase
          .from("user_consents" as never)
          .upsert(
            { user_id: session.user.id, ...payload } as never,
            { onConflict: "user_id" as never, ignoreDuplicates: false },
          );
      } catch { /* non-blocking */ } finally {
        try { localStorage.removeItem(PENDING_CONSENT_KEY); } catch { /* ignore */ }
      }
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void getOrRefreshSession().catch(() => {});
    };

    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(clearFlag);
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
