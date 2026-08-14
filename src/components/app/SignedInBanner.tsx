import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bandeau affiché sur les tunnels d'inscription lorsqu'une session est déjà
 * ouverte (ex. compte admin) : évite de créer un profil sur le mauvais compte.
 */
export function SignedInBanner({ onSignedOut }: { onSignedOut?: () => void }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setEmail(data.session?.user.email ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!email) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
      Connecté en tant que <strong className="text-foreground">{email}</strong> —{" "}
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          setEmail(null);
          onSignedOut?.();
        }}
        className="underline hover:text-foreground"
      >
        se déconnecter pour créer un autre compte
      </button>
    </div>
  );
}
