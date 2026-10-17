import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const allowed = await checkBetaAccess();
      if (cancelled) return;
      setStatus(allowed ? "allowed" : "waitlist");
    };

    supabase.auth.getSession().then(({ data }) => {
      check(data.session?.user?.email?.toLowerCase());
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
