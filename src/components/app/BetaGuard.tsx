import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function getBetaWhitelist(): string[] {
  const raw = import.meta.env.VITE_BETA_EMAILS ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function BetaGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "allowed" | "waitlist">("loading");

  useEffect(() => {
    const whitelist = getBetaWhitelist();

    // Whitelist vide → app ouverte à tous
    if (whitelist.length === 0) {
      setStatus("allowed");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email?.toLowerCase();
      if (!email) {
        // Non connecté → laisser passer (les routes protégées gèrent leur propre auth)
        setStatus("allowed");
        return;
      }
      setStatus(whitelist.includes(email) ? "allowed" : "waitlist");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase();
      if (!email) {
        setStatus("allowed");
        return;
      }
      setStatus(whitelist.includes(email) ? "allowed" : "waitlist");
    });

    return () => subscription.unsubscribe();
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
