import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { PayeeConnectCard } from "@/components/PayeeConnectCard";

type Profile = {
  id: string;
  kind: "driver" | "installer" | "both";
  full_name: string;
  phone: string | null;
  city: string | null;
  status: string;
};

const KIND_LABEL: Record<Profile["kind"], string> = {
  driver: "Chauffeur",
  installer: "Poseur covering",
  both: "Chauffeur & poseur",
};

export const Route = createFileRoute("/chauffeur/espace")({
  head: () => ({
    meta: [
      { title: "Espace chauffeur / poseur — MoveSpot" },
      {
        name: "description",
        content: "Gérez votre profil prestataire MoveSpot et vos reversements automatiques sur IBAN.",
      },
      { property: "og:title", content: "Espace chauffeur / poseur — MoveSpot" },
      { property: "og:description", content: "Profil prestataire et reversements automatiques MoveSpot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ChauffeurEspace;
});

function ChauffeurEspace() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/chauffeur/inscription" }); return; }
      const { data } = await supabase
        .from("payee_profiles")
        .select("id, kind, full_name, phone, city, status")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!data) { navigate({ to: "/chauffeur/inscription" }); return; }
      setProfile(data as Profile);
      setState("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <LogoLink />
          <Link to="/chauffeur" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Suivi GPS →
          </Link>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold">Bonjour {profile?.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile ? KIND_LABEL[profile.kind] : ""}
            {profile?.city ? ` · ${profile.city}` : ""}
          </p>
        </div>

        <PayeeConnectCard />

        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <h3 className="font-display text-lg font-semibold">Comment vous êtes payé</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Vous liez votre IBAN via Stripe (une seule fois).</li>
            <li>Vous réalisez la prestation : pose du covering ou trajets avec suivi GPS.</li>
            <li>MoveSpot valide la prestation et déclenche le reversement sur votre compte.</li>
            <li>Stripe verse les fonds sur votre IBAN, sans intervention de votre part.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
          <h3 className="font-display text-lg font-semibold">Suivi GPS des campagnes</h3>
          <p className="text-sm text-muted-foreground">
            Scannez le QR code collé dans le véhicule pour démarrer le suivi d'une campagne.
          </p>
          <Link to="/chauffeur" className="inline-block text-sm font-semibold text-primary hover:underline">
            Ouvrir le suivi GPS →
          </Link>
        </div>
      </div>
    </div>
  );
}
