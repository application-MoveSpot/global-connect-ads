import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogoLink } from "@/components/app/LogoLink";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { RouteSummary } from "@/components/shared/RouteSummary";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { CampaignStepper } from "@/components/shared/CampaignStepper";
import { MobilityMap } from "@/components/shared/MobilityMap";
import { supabase } from "@/integrations/supabase/client";
import { payCampaignWithWallet, getMyWallet } from "@/lib/payments/wallet.functions";
import { track } from "@/lib/analytics/track";
import { downloadCsv } from "@/lib/exportCsv";
import { toast } from "sonner";
import { NetworkErrorBanner } from "@/components/app/NetworkErrorBanner";
import { withRetry } from "@/lib/retry";
import { RouteError } from "@/components/app/RouteError";

type Req = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
  total_price: number | null;
  payment_status: string;
  installation_status: string | null;
  subscription_status: string | null;
};

type Profile = { full_name: string; company: string | null };

export const Route = createFileRoute("/annonceur/")({
  head: () => ({
    meta: [
      { title: "Espace annonceur — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnnonceurDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function AnnonceurDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [paying, setPaying] = useState<string | null>(null);
  const payFn = useServerFn(payCampaignWithWallet);
  const walletFn = useServerFn(getMyWallet);

  const reload = useCallback(
    async (userId: string) => {
      const [{ data: reqs, error: reqErr }, w] = await Promise.all([
        supabase
          .from("campaign_requests")
          .select(
            "id, spot_name, spot_location, spot_price, message, status, owner_response, admin_notes, created_at, route_zones, route_waypoints, route_pois, estimated_impressions_per_day, days_count, creative_files, total_price, payment_status, installation_status, subscription_status",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        walletFn(),
      ]);
      if (reqErr) throw new Error(reqErr.message);
      setRequests((reqs as unknown as Req[]) ?? []);
      setBalanceCents(w?.balance_cents ?? 0);
    },
    [walletFn],
  );

  const init = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/annonceur/inscription" });
      return;
    }
    const { data: prof, error: profErr } = await supabase
      .from("advertiser_profiles")
      .select("full_name, company")
      .eq("user_id", sess.session.user.id)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!prof) {
      navigate({ to: "/annonceur/inscription" });
      return;
    }
    setProfile(prof);
    setUserId(sess.session.user.id);
    await reload(sess.session.user.id);
    setLoading(false);
  }, [navigate, reload]);

  const loadWithRetry = useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) setRetrying(true);
      setLoadError(null);
      try {
        await withRetry(init, { maxAttempts: 3 });
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les données. Vérifiez votre connexion.",
        );
        setLoading(false);
      } finally {
        if (isManualRetry) setRetrying(false);
      }
    },
    [init],
  );

  useEffect(() => {
    void loadWithRetry();
  }, [loadWithRetry]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`annonceur-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_requests",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void reload(userId);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  const exportCsv = () => {
    const rows = requests.map((r) => ({
      id: r.id,
      spot: r.spot_name,
      localisation: r.spot_location ?? "",
      statut: r.status,
      paiement: r.payment_status,
      installation: r.installation_status ?? "",
      prix_total_eur: r.total_price ?? "",
      prix_par_jour_eur: r.spot_price ?? "",
      jours: r.days_count ?? "",
      impressions_par_jour: r.estimated_impressions_per_day ?? "",
      date_creation: r.created_at,
    }));
    downloadCsv(rows, `movespot-campagnes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePay = async (r: Req) => {
    const cents = Math.round(Number(r.total_price ?? 0) * 100);
    if (cents > balanceCents) {
      toast.error(`Solde insuffisant. Manque ${((cents - balanceCents) / 100).toFixed(2)} €.`);
      navigate({ to: "/annonceur/portefeuille" });
      return;
    }
    setPaying(r.id);
    try {
      await payFn({ data: { campaignRequestId: r.id } });
      void track("campaign_paid", { campaign_request_id: r.id, total_price: r.total_price });
      toast.success("Paiement effectué ✓");
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) await reload(sess.session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec du paiement");
    } finally {
      setPaying(null);
    }
  };

  if (loading && !loadError)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.full_name}
              {profile?.company ? ` · ${profile.company}` : ""}
            </span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary transition"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <NetworkErrorBanner
            message={loadError}
            onRetry={() => loadWithRetry(true)}
            retrying={retrying}
          />
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Mes campagnes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivez le statut de vos réservations.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/annonceur/portefeuille"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              💳 Portefeuille · {(balanceCents / 100).toFixed(2)} €
            </Link>
            <Link
              to="/prestataires"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              🎨 Prestataires covering
            </Link>
            <Link
              to="/annonceur/briefs"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              Mes briefs
            </Link>
            <Link
              to="/annonceur/etude-marche"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              📊 Étude de marché
            </Link>
            <Link
              to="/annonceur/briefs/nouveau"
              className="rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/20 transition"
            >
              + Nouveau brief
            </Link>
            <Link
              to="/"
              hash="spots"
              className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
            >
              + Nouvelle campagne
            </Link>
            {requests.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
              >
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>

        {/* ── Card de découverte Camion LED ── */}
        <div
          className="mb-8 rounded-2xl overflow-hidden border border-border relative"
          style={{ background: "linear-gradient(135deg, #0a0a14 0%, #0d1220 60%, #0f0f1a 100%)" }}
        >
          {/* Lueur LED décorative */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 75% 50%, rgba(40,100,255,0.10) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center gap-6 px-6 py-7">
            {/* Icône silhouette */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-xl"
              style={{
                width: 90,
                height: 64,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Mini silhouette CSS du camion */}
              <div style={{ position: "relative", width: 82, height: 44 }}>
                {/* Caisse */}
                <div
                  style={{
                    position: "absolute",
                    left: "30%",
                    right: 0,
                    top: 0,
                    height: 40,
                    background: "#0c0c12",
                    border: "1px solid #1e1e30",
                    borderRadius: "1px 4px 4px 1px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "3px 3px 8px 3px",
                      background: "linear-gradient(135deg, #030a1c, #050d24)",
                      boxShadow:
                        "0 0 12px 3px rgba(40,100,255,0.25), inset 0 0 0 1px rgba(60,120,255,0.2)",
                    }}
                  />
                </div>
                {/* Cab */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "31%",
                    top: 13,
                    height: 27,
                    background: "#0d0d0d",
                    border: "1px solid #1a1a1a",
                    borderRadius: "4px 1px 1px 4px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      right: 3,
                      height: 9,
                      background: "rgba(60,120,220,0.12)",
                      border: "0.5px solid rgba(100,160,255,0.1)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                {/* Roues */}
                {[{ l: 2 }, { l: 16 }, { l: 55 }].map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: p.l,
                      width: i === 0 ? 12 : 10,
                      height: i === 0 ? 12 : 10,
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 35%, #3a3a5c, #1a1a2e)",
                      border: "1.5px solid #252545",
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Textes */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <span
                  className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(60,120,255,0.15)",
                    color: "rgba(120,170,255,0.9)",
                    border: "1px solid rgba(60,120,255,0.25)",
                  }}
                >
                  Nouveau
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                Camion Écran LED — Affichage Mobile Haute Visibilité
              </h2>
              <p className="text-sm mb-3" style={{ color: "rgba(180,200,240,0.7)" }}>
                3 faces LED IP67 · 3200×1920 px · Vidéo MP4 / Image / Flux HTML5 · Jusqu'à 20 000
                contacts/jour
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Link
                  to="/annonceur/briefs/nouveau"
                  className="rounded-full px-5 py-2 text-sm font-semibold transition"
                  style={{ background: "rgba(60,120,255,0.85)", color: "#fff" }}
                >
                  + Créer un brief Camion LED
                </Link>
                <Link
                  to="/annonceur/etude-marche"
                  className="rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(180,200,240,0.8)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Voir les tarifs →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-muted-foreground mb-4">Vous n'avez pas encore de campagne.</p>
            <Link to="/" hash="spots" className="text-primary font-semibold hover:underline">
              Parcourir les véhicules →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="font-semibold">{r.spot_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.spot_location} · {r.spot_price}€/jour
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 max-w-xl">
                      {r.message}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
                <CampaignStepper
                  status={r.status}
                  paymentStatus={r.payment_status}
                  installationStatus={r.installation_status}
                  subscriptionStatus={r.subscription_status}
                />
                {r.admin_notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
                    <strong>Motif :</strong> {r.admin_notes}
                  </div>
                )}
                <StatusHistory
                  entityType="campaign_status"
                  entityId={r.id}
                  statusLabel={{ pending: "En attente", approved: "Validée", rejected: "Refusée" }}
                  triggerLabel="Historique de la demande"
                />
                <RouteSummary
                  zones={r.route_zones}
                  waypoints={r.route_waypoints}
                  pois={r.route_pois}
                  impressionsPerDay={r.estimated_impressions_per_day}
                  days={r.days_count}
                />
                <CreativeFiles paths={r.creative_files} />
                {r.status === "approved" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <PaymentBadge status={r.payment_status} />
                    {r.subscription_status && <SubscriptionBadge status={r.subscription_status} />}
                    {r.payment_status !== "paid" && r.total_price != null && (
                      <button
                        onClick={() => handlePay(r)}
                        disabled={paying === r.id}
                        className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                      >
                        {paying === r.id
                          ? "Paiement…"
                          : `Payer ${Number(r.total_price).toFixed(2)} € avec mon portefeuille`}
                      </button>
                    )}
                    <Link
                      to="/annonceur/suivi/$campaignId"
                      params={{ campaignId: r.id }}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition"
                    >
                      📍 Suivre en direct
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-2">
            Aperçu illustratif des flux de véhicules
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Visualisation indicative — données réelles branchées progressivement.
          </p>
          <MobilityMap />
        </section>

        <div className="mt-10 rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">📜 Propriété intellectuelle :</strong> en soumettant
          un visuel publicitaire, vous garantissez en détenir tous les droits (créations, marques,
          droit à l'image, musiques) et vous engagez à respecter la législation française et
          européenne. Tout contenu litigieux est refusé.
        </div>
      </main>
      <FAQChatbot
        audience="annonceur"
        suggestions={[
          "Comment payer ma campagne validée ?",
          "Combien de temps dure la validation de ma campagne ?",
          "Quels contenus publicitaires sont interdits ?",
          "Comment recharger mon portefeuille ?",
          "À quoi sert un brief ?",
        ]}
      />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-secondary text-foreground" },
    approved: { label: "Validée", cls: "bg-signal/20 text-signal" },
    rejected: { label: "Refusée", cls: "bg-destructive/20 text-destructive" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "À payer", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    paid: { label: "Payée ✓", cls: "bg-signal/20 text-signal" },
    refunded: { label: "Remboursée", cls: "bg-secondary text-foreground" },
    partial_refund: { label: "Remb. partiel", cls: "bg-secondary text-foreground" },
  };
  const s = map[status] ?? map.unpaid;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

function SubscriptionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    trialing: { label: "Essai gratuit en cours", cls: "bg-signal/20 text-signal" },
    active: { label: "Abonnement actif", cls: "bg-signal/20 text-signal" },
    past_due: { label: "Paiement échoué", cls: "bg-destructive/20 text-destructive" },
    unpaid: { label: "Impayé", cls: "bg-destructive/20 text-destructive" },
    canceled: { label: "Abonnement résilié", cls: "bg-secondary text-foreground" },
    incomplete: {
      label: "Souscription en cours",
      cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
  };
  const s = map[status];
  if (!s) return null;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}
