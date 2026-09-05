import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { NotificationBell } from "@/components/app/NotificationBell";
import { pushNotification } from "@/hooks/useNotifications";
import { PayeeConnectCard } from "@/components/driver/PayeeConnectCard";
import { InstallationJobsPanel } from "@/components/driver/InstallationJobsPanel";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { getPayeeEarnings, VEHICLE_KIND_LABEL, type VehicleKind } from "@/lib/payments/payee.functions";
import { getDriverVehicleQrTokens } from "@/lib/qr/qr.functions";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { RouteError } from "@/components/app/RouteError";
import { SignalementDialog } from "@/components/shared/SignalementDialog";

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
  stripe_account_id: string | null;
  stripe_payouts_enabled: boolean | null;
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
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function ChauffeurEspace() {
  const navigate = useNavigate();
  const fetchEarnings = useServerFn(getPayeeEarnings);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [earnings, setEarnings] = useState<{ totalCents: number; paidCents: number; pendingCents: number } | null>(null);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const { state: pushState, subscribe: subscribePush } = usePushSubscription(authUserId);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [driverQrs, setDriverQrs] = useState<{ vehicleId: string; vehicleName: string; vehicleType: string; qrImg: string; url: string }[]>([]);
  const fetchDriverQrs = useServerFn(getDriverVehicleQrTokens);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("payee_profiles")
      .select("id, kind, full_name, phone, city, status, vehicle_kind, vehicle_plate, certification_status, certification_notes, stripe_account_id, stripe_payouts_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/chauffeur/inscription" }); return; }
      const userId = sess.session.user.id;
      userIdRef.current = userId;
      setAuthUserId(userId);
      const { data } = await supabase
        .from("payee_profiles")
        .select("id, kind, full_name, phone, city, status, vehicle_kind, vehicle_plate, certification_status, certification_notes, stripe_account_id, stripe_payouts_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) { navigate({ to: "/chauffeur/inscription" }); return; }
      setProfile(data as Profile);
      setState("ready");
      fetchEarnings()
        .then((e: any) => setEarnings({ totalCents: e.totalCents, paidCents: e.paidCents, pendingCents: e.pendingCents }))
        .catch(() => setEarnings({ totalCents: 0, paidCents: 0, pendingCents: 0 }));
      // Load driver QR codes for assigned vehicles
      fetchDriverQrs().then(async (res: { vehicles: { vehicleId: string; vehicleName: string; vehicleType: string; token: string }[] }) => {
        const origin = window.location.origin;
        const qrs = await Promise.all(
          res.vehicles.map(async (v: { vehicleId: string; vehicleName: string; vehicleType: string; token: string }) => {
            const url = `${origin}/chauffeur?t=${encodeURIComponent(v.token)}`;
            const qrImg = await QRCode.toDataURL(url, { width: 320, margin: 1 }).catch(() => "");
            return { vehicleId: v.vehicleId, vehicleName: v.vehicleName, vehicleType: v.vehicleType, qrImg, url };
          }),
        );
        setDriverQrs(qrs.filter((q) => q.qrImg));
      }).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: certification status + Stripe payout status changes
  useEffect(() => {
    if (!profile) return;
    const userId = userIdRef.current;
    if (!userId) return;
    const channel = supabase
      .channel(`chauffeur-profile-${profile.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payee_profiles", filter: `user_id=eq.${userId}` }, (payload) => {
          const newCertif = (payload.new as Record<string, unknown>).certification_status as string | undefined;
          if (newCertif === "certified") pushNotification("Certification validée !", "Vous êtes maintenant certifié MoveSpot.");
          else if (newCertif === "rejected") pushNotification("Certification refusée", "Votre certification a été refusée. Consultez les notes.");
          void loadProfile(userId);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (state === "loading") {
    return <div className="min-h-screen bg-background p-8 text-muted-foreground">Chargement…</div>;
  }

  const certif = CERTIF[profile?.certification_status ?? "pending"] ?? CERTIF["pending"]!;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <NotificationBell userId={authUserId} />
            <Link to="/chauffeur" search={{ t: "" }} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Suivi GPS →
            </Link>
          </div>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold">Bonjour {profile?.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile ? KIND_LABEL[profile.kind] : ""}
            {profile?.city ? ` · ${profile.city}` : ""}
          </p>
        </div>

        {profile && (profile.kind === "installer" || profile.kind === "both") &&
          profile.certification_status === "certified" &&
          (pushState === "default" || pushState === "loading") && (
          <button
            onClick={async () => { setSubscribingPush(true); await subscribePush(); setSubscribingPush(false); }}
            disabled={subscribingPush}
            className="flex items-start gap-3 w-full rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-300 text-left hover:opacity-90 transition disabled:opacity-60"
          >
            <span className="mt-0.5 text-base shrink-0">🔔</span>
            <span>
              Activez les notifications push pour être alerté instantanément dès qu'une nouvelle mission est disponible.{" "}
              <strong className="underline">{subscribingPush ? "Activation…" : "Activer les alertes →"}</strong>
            </span>
          </button>
        )}

        {profile && !profile.stripe_payouts_enabled && (
          <a
            href="#reversements"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm no-underline transition hover:opacity-90 ${
              profile.stripe_account_id
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            <span className="mt-0.5 text-base">{profile.stripe_account_id ? "⚠️" : "🔴"}</span>
            <span>
              {profile.stripe_account_id
                ? "Votre onboarding Stripe est incomplet — finalisez la vérification pour recevoir vos reversements."
                : "Vous n'avez pas encore lié votre IBAN. Sans cette étape, aucun reversement ne peut vous être versé."}
              {" "}
              <strong className="underline">Configurer maintenant →</strong>
            </span>
          </a>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Certification</p>
            <p className={`mt-2 text-sm font-semibold ${certif.className}`}>{certif.label}</p>
            {profile?.certification_notes && (
              <p className="mt-1 text-xs text-muted-foreground">{profile.certification_notes}</p>
            )}
            {profile && (
              <div className="mt-2">
                <StatusHistory
                  entityType="payee_certification"
                  entityId={profile.id}
                  statusLabel={{ pending: "En attente", certified: "Certifié", rejected: "Refusé" }}
                />
              </div>
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

        <div id="reversements">
          <PayeeConnectCard />
        </div>

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

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold">Suivi GPS des campagnes</h3>
          {driverQrs.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Voici vos QR codes de suivi. Scannez-les avec votre téléphone pour démarrer le tracking GPS, ou imprimez-les pour les coller dans la cabine.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {driverQrs.map((q) => (
                  <div key={q.vehicleId} className="rounded-xl border border-border bg-secondary/20 p-4 flex items-center gap-4">
                    <img
                      src={q.qrImg}
                      alt={`QR ${q.vehicleName}`}
                      width={96}
                      height={96}
                      className="rounded border border-border bg-white p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{q.vehicleName}</p>
                      <p className="text-xs text-muted-foreground mb-2">{q.vehicleType}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.vehicleType === "camion_led" ? (
                          <Link
                            to="/chauffeur/ecran"
                            search={{ t: encodeURIComponent(q.url.split("?t=")[1] ?? "") }}
                            className="text-xs font-semibold text-indigo-400 hover:underline"
                          >
                            📺 Démarrer l'écran →
                          </Link>
                        ) : (
                          <Link
                            to="/chauffeur"
                            search={{ t: encodeURIComponent(q.url.split("?t=")[1] ?? "") }}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Démarrer le GPS →
                          </Link>
                        )}
                        <a
                          href={q.qrImg}
                          download={`qr-gps-${q.vehicleId}.png`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Télécharger
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scannez le QR code collé dans le véhicule pour démarrer le suivi d'une campagne.
              Aucun véhicule ne vous est encore assigné — votre propriétaire peut le faire depuis son espace flotte.
            </p>
          )}
          <Link to="/chauffeur" search={{ t: "" }} className="inline-block text-sm font-semibold text-primary hover:underline">
            Ouvrir le suivi GPS →
          </Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-border flex justify-end px-4 pb-4">
        <SignalementDialog contextUrl="/chauffeur/espace" triggerLabel="Signaler un problème" />
      </div>
    </div>
  );
}
