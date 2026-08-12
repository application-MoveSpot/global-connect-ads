import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { PayeeConnectCard } from "@/components/PayeeConnectCard";
import { InstallationJobsPanel } from "@/components/InstallationJobsPanel";
import { getPayeeEarnings, VEHICLE_KIND_LABEL, type VehicleKind } from "@/lib/payee.functions";

type Profile = {
  id: string;
  kind: "driver" | "installer" | "both";
  full_name: string;
  phone: string | null;
  city: string | null;
  status: string;
  vehicle_kind: VehicleKind | null;
  vehicle_plate: string | null;
  certification_status: string;
  certification_notes: string | null;
};

const KIND_LABEL: Record<Profile["kind"], string> = {
  driver: "Chauffeur",
  installer: "Poseur covering",
  both: "Chauffeur & poseur",
};

const CERTIF: Record<string, { label: string; className: string }> = {
  pending: { label: "⏳ En attente de certification", className: "text-amber-500" },
  certified: { label: "✅ Certifié MoveSpot", className: "text-emerald-500" },
  rejected: { label: "⛔ Certification refusée", className: "text-destructive" },
};

const eur = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });


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
  component: ChauffeurEspace,
});

function ChauffeurEspace() {
  const navigate = useNavigate();
  const fetchEarnings = useServerFn(getPayeeEarnings);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earnings, setEarnings] = useState<{ totalCents: number; paidCents: number; pendingCents: number } | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/chauffeur/inscription" }); return; }
      const { data } = await supabase
        .from("payee_profiles")
        .select("id, kind, full_name, phone, city, status, vehicle_kind, vehicle_plate, certification_status, certification_notes")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!data) { navigate({ to: "/chauffeur/inscription" }); return; }
      setProfile(data as Profile);
      setState("ready");
      fetchEarnings()
        .then((e) => setEarnings({ totalCents: e.totalCents, paidCents: e.paidCents, pendingCents: e.pendingCents }))
        .catch(() => setEarnings({ totalCents: 0, paidCents: 0, pendingCents: 0 }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">Chargement…</div>;
  }

  const certif = CERTIF[profile?.certification_status ?? "pending"] ?? CERTIF["pending"]!;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <LogoLink />
          <Link to="/chauffeur" search={{ t: "" }} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Certification</p>
            <p className={`mt-2 text-sm font-semibold ${certif.className}`}>{certif.label}</p>
            {profile?.certification_notes && (
              <p className="mt-1 text-xs text-muted-foreground">{profile.certification_notes}</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Véhicule</p>
            <p className="mt-2 text-sm font-semibold">
              {profile?.vehicle_kind ? VEHICLE_KIND_LABEL[profile.vehicle_kind] : "Non renseigné"}
            </p>
            {profile?.vehicle_plate && (
              <p className="mt-1 text-xs text-muted-foreground">Immat. {profile.vehicle_plate}</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Gains cumulés</p>
            <p className="mt-2 text-2xl font-bold">{eur(earnings?.totalCents ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {eur(earnings?.paidCents ?? 0)} versés · {eur(earnings?.pendingCents ?? 0)} en attente
            </p>
          </div>
        </div>

        <PayeeConnectCard />

        {profile && (profile.kind === "installer" || profile.kind === "both") ? <InstallationJobsPanel /> : null}


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
          <Link to="/chauffeur" search={{ t: "" }} className="inline-block text-sm font-semibold text-primary hover:underline">
            Ouvrir le suivi GPS →
          </Link>
        </div>
      </div>
    </div>
  );
}
