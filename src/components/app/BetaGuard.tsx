import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

async function fetchWhitelist(): Promise<string[]> {
  const { data } = await supabase.from("beta_whitelist").select("email");
  return data?.map((r: { email: string }) => r.email.toLowerCase()) ?? [];
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
      const whitelist = await fetchWhitelist();
      if (cancelled) return;
      // Whitelist vide → app ouverte à tous
      if (whitelist.length === 0) {
        setStatus("allowed");
        return;
      }
      setStatus(whitelist.includes(email) ? "allowed" : "waitlist");
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

  if (status === "loading") return null;
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
