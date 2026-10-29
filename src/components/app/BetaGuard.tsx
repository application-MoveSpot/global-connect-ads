import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forceRefreshSession, getOrRefreshSession } from "@/integrations/supabase/session";

// Uses a SECURITY DEFINER RPC so the full whitelist is never exposed:
// returns true if the whitelist is empty (open to all) or the user's
// email is in it, false otherwise.
async function checkBetaAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_beta_access");
  if (error) {
    // On error, fail open so a DB hiccup never locks everyone out.
    console.error("BetaGuard: check_beta_access RPC error", error);
    return true;
  }
  return data === true;
}

export function BetaGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "allowed" | "waitlist">("loading");

  useEffect(() => {
    let cancelled = false;

    const check = async (email: string | undefined) => {
      if (!email) {
        // Non connecté → laisser passer (les routes protégées gèrent leur propre auth)
        if (!cancelled) setStatus("allowed");
        return;
      }
      let allowed = await checkBetaAccess();
      // JWT can be stale after a redeploy or Supabase resume — the RPC gets a
      // null email from auth.jwt() and returns false even for whitelisted users.
      // Refresh once and retry before concluding the user is on the waitlist.
      if (!allowed) {
        const refreshed = await forceRefreshSession();
        if (refreshed) allowed = await checkBetaAccess();
      }
      if (cancelled) return;
      setStatus(allowed ? "allowed" : "waitlist");
    };

    getOrRefreshSession()
      .then((session) => {
        check(session?.user?.email?.toLowerCase());
      })
      .catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED is fired by our own refreshSession() call inside check().
      // Listening to it would re-trigger check() → refreshSession() → TOKEN_REFRESHED → ∞
      // INITIAL_SESSION is already handled by the getOrRefreshSession() call above, and
      // SIGNED_IN fires on every tab-focus via _recoverAndRefresh() — both only cause
      // redundant check_beta_access RPC calls once status is already "allowed".
      if (
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN"
      )
        return;
      check(session?.user?.email?.toLowerCase());
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") return <>{children}</>;
  if (status === "waitlist") return <WaitlistPage />;
  return <>{children}</>;
}

function WaitlistPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">🚀</div>
        <h1 className="text-2xl font-bold text-foreground">MoveSpot arrive bientôt</h1>
        <p className="text-muted-foreground">
          La plateforme est en phase de lancement privé. Vous êtes sur liste d'attente — nous vous
          contacterons dès que votre accès est activé.
        </p>
        <p className="text-xs text-muted-foreground">
          Vous avez déjà un accès ?{" "}
          <button className="underline" onClick={() => supabase.auth.signOut()}>
            Changer de compte
          </button>
        </p>
      </div>
    </div>
  );
}
