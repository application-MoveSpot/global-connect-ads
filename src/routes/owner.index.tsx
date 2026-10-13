import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recommendVehiclePrice, type PricingRecommendation } from "@/lib/ai/owner-pricing.functions";
import { respondToCampaignRequest } from "@/lib/campaigns/campaign-notifications.server";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { FAQChatbot } from "@/components/app/FAQChatbot";
import { RouteSummary } from "@/components/shared/RouteSummary";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { OwnerConnectCard } from "@/components/owner/OwnerConnectCard";
import { VigAlerte } from "@/components/owner/VigAlerte";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { NotificationBell } from "@/components/app/NotificationBell";
import { pushNotification } from "@/hooks/useNotifications";
import { NetworkErrorBanner } from "@/components/app/NetworkErrorBanner";
import { withRetry } from "@/lib/retry";
import { downloadCsv } from "@/lib/exportCsv";
import { RouteError } from "@/components/app/RouteError";
import { SignalementDialog } from "@/components/shared/SignalementDialog";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";

const MobilityMap = lazy(() =>
  import("@/components/shared/MobilityMap").then((m) => ({ default: m.MobilityMap })),
);

export const Route = createFileRoute("/owner/")({
  head: () => ({
    meta: [
      { title: "Espace propriétaire — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string | null;
  price_per_day: number;
  status: string;
  admin_notes: string | null;
  photos: string[] | null;
  created_at: string;
  condition: string | null;
  km_per_day: number | null;
  surface_m2: number | null;
  zones: string[] | null;
  description: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  camion_led: "Camion LED",
  food_truck: "Food truck",
  van: "Van utilitaire",
  taxi: "Taxi / VTC",
  voiture: "Voiture",
  scooter: "Scooter livraison",
  velo_cargo: "Vélo cargo",
  velo_remorque: "Vélo remorque",
  triporteur: "Triporteur",
  tutuk: "Tutuk",
  autre: "Autre",
};

type Request = {
  id: string;
  vehicle_id: string | null;
  spot_name: string;
  company: string;

  message: string;
  status: string;
  owner_response: string;
  admin_notes: string | null;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ id: string; full_name: string } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tab, setTab] = useState<"vehicles" | "requests">("vehicles");
  const callRespondToCampaign = useServerFn(respondToCampaignRequest);

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/owner/inscription" });
      return;
    }
    setUserId(session.user.id);
    const { data: prof, error: profErr } = await supabase
      .from("owner_profiles")
      .select("id, full_name")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!prof) {
      navigate({ to: "/owner/inscription" });
      return;
    }
    setProfile(prof);
    const [{ data: v, error: vErr }, { data: r, error: rErr }] = await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .eq("owner_id", prof.id)
        .order("created_at", { ascending: false }),
      supabase.from("campaign_requests").select("*").order("created_at", { ascending: false }),
    ]);
    if (vErr) throw new Error(vErr.message);
    if (rErr) throw new Error(rErr.message);
    setVehicles((v as Vehicle[]) ?? []);
    setRequests((r as Request[]) ?? []);
    setLoading(false);
  }, [navigate]);

  const loadWithRetry = useCallback(
    async (isManualRetry = false) => {
      if (isManualRetry) setRetrying(true);
      setLoadError(null);
      try {
        await withRetry(load, { maxAttempts: 3 });
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : t("errors.network"),
        );
        setLoading(false);
      } finally {
        if (isManualRetry) setRetrying(false);
      }
    },
    [load],
  );

  useEffect(() => {
    void loadWithRetry();
  }, [loadWithRetry]);

  // Realtime: new/updated campaign requests + vehicle status changes
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`owner-dashboard-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_requests" },
        (payload) => {
          if ((payload as { eventType?: string }).eventType === "INSERT") {
            const company = (payload.new as Record<string, unknown>).company as string | undefined;
            pushNotification(
              t("owner.new_campaign_notif"),
              company ? t("owner.notif_new_campaign_body", { company }) : undefined,
            );
          }
          void loadWithRetry();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vehicles",
          filter: `owner_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newStatus = row.status as string | undefined;
          const vName = row.name as string | undefined;
          if (newStatus === "approved")
            pushNotification(
              t("owner.vehicle_approved_notif"),
              vName ? t("owner.notif_vehicle_approved_body", { name: vName }) : undefined,
            );
          else if (newStatus === "rejected")
            pushNotification(
              t("owner.vehicle_rejected_notif"),
              vName ? t("owner.notif_vehicle_rejected_body", { name: vName }) : undefined,
            );
          void loadWithRetry();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, load, loadWithRetry]);

  const respond = async (id: string, response: "accepted" | "rejected") => {
    await callRespondToCampaign({ data: { campaignId: id, response } });
    void loadWithRetry();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const exportVehiclesCsv = () => {
    const rows = vehicles.map((v) => ({
      id: v.id,
      nom: v.name,
      type: v.type,
      format: v.format_publicitaire,
      prix_par_jour_eur: v.price_per_day,
      statut: v.status,
      date_ajout: v.created_at,
    }));
    downloadCsv(rows, `movespot-vehicules-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportRequestsCsv = () => {
    const rows = requests.map((r) => ({
      id: r.id,
      advertiser: r.company,
      spot: r.spot_name,
      statut: r.status,
      prix_total_eur: r.total_price ?? "",
      jours: r.days_count ?? "",
      debut: r.start_date ?? "",
      fin: r.end_date ?? "",
      impressions_par_jour: r.estimated_impressions_per_day ?? "",
      date_reception: r.created_at,
    }));
    downloadCsv(rows, `movespot-demandes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading && !loadError)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("owner.welcome", { name: profile?.full_name })}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram MoveSpot"
              className="rounded-full p-1.5 hover:bg-muted transition text-muted-foreground hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <Link
              to="/owner/profil"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("profile.title")}
            </Link>
            <Link
              to="/parametres"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("common.settings")}
            </Link>
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <NetworkErrorBanner
            message={loadError}
            onRetry={() => loadWithRetry(true)}
            retrying={retrying}
          />
        </div>
      )}

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Alerte vigilance Urssaf — s'affiche uniquement si nécessaire */}
        <VigAlerte />
        <OwnerConnectCard />

        {(vehicles.length > 0 || requests.length > 0) && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("owner.kpi_approved_vehicles")}</p>
              <p className="font-display text-2xl font-bold">{vehicles.filter((v) => v.status === "approved").length}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("owner.kpi_pending_requests")}</p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">{requests.filter((r) => !r.owner_response).length}</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("owner.kpi_active_campaigns")}</p>
              <p className="font-display text-2xl font-bold text-primary">{requests.filter((r) => r.status === "approved").length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("owner.kpi_month_revenue")}</p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {(() => {
                  const key = new Date().toISOString().slice(0, 7);
                  const total = requests
                    .filter((r) => ["approved", "paid", "completed"].includes(r.status) && r.created_at.startsWith(key))
                    .reduce((s, r) => s + (r.total_price ?? 0), 0);
                  return total.toLocaleString(dateLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
                })()}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <Tab
              active={tab === "vehicles"}
              onClick={() => setTab("vehicles")}
              count={vehicles.length}
            >
              {t("owner.my_vehicles")}
            </Tab>
            <Tab
              active={tab === "requests"}
              onClick={() => setTab("requests")}
              count={requests.length}
              pendingCount={requests.filter((r) => !r.owner_response).length}
            >
              {t("owner.requests_tab")}
            </Tab>
            <Link
              to="/owner/briefs"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              {t("owner.nav_briefs")}
            </Link>
            <Link
              to="/owner/tracking"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
            >
              {t("owner.nav_tracking")}
            </Link>
            <Link
              to="/owner/flotte"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 transition"
            >
              {t("owner.nav_fleet")}
            </Link>
            <Link
              to="/owner/flotte/import"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              {t("owner.nav_import")}
            </Link>
            <Link
              to="/owner/flotte/qr"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              {t("owner.nav_qr")}
            </Link>
            <Link
              to="/owner/carte"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              {t("owner.nav_carte")}
            </Link>
            <Link
              to="/owner/historique"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              {t("owner.nav_historique")}
            </Link>
            <Link
              to="/owner/messages"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition"
            >
              {t("owner.nav_messages")}
            </Link>
          </div>
          <div className="flex gap-2">
            {tab === "vehicles" && vehicles.length > 0 && (
              <button
                type="button"
                onClick={exportVehiclesCsv}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
              >
                {t("common.export_csv")}
              </button>
            )}
            {tab === "requests" && requests.length > 0 && (
              <button
                type="button"
                onClick={exportRequestsCsv}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
              >
                {t("common.export_csv")}
              </button>
            )}
            {tab === "vehicles" && (
              <Link
                to="/owner/vehicules/nouveau"
                className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
              >
                + {t("owner.add_vehicle")}
              </Link>
            )}
          </div>
        </div>

        {tab === "vehicles" ? (
          vehicles.length === 0 ? (
            <OwnerVehicleOnboarding />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <OwnerVehicleCard key={v.id} v={v} />
              ))}
            </div>
          )
        ) : requests.length === 0 ? (
          <OwnerRequestsEmpty hasVehicles={vehicles.length > 0} hasApproved={vehicles.some(v => v.status === "approved")} />
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {r.spot_name}
                    </div>
                    <h3 className="font-display text-xl font-bold mt-1">{r.company}</h3>
                  </div>
                  <div className="text-right">
                    <ResponseBadge response={r.owner_response} />
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleString(dateLocale)}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/40 p-4 text-sm mb-4 whitespace-pre-wrap">
                  {r.message}
                </div>
                <RouteSummary
                  zones={r.route_zones}
                  waypoints={r.route_waypoints}
                  pois={r.route_pois}
                  impressionsPerDay={r.estimated_impressions_per_day}
                  days={r.days_count}
                />
                <CreativeFiles paths={r.creative_files} />
                {r.admin_notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs mb-4">
                    <strong>{t("owner.reason_label")}</strong> {r.admin_notes}
                  </div>
                )}
                {r.owner_response === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(r.id, "accepted")}
                      className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-2 text-sm font-semibold hover:bg-signal/30"
                    >
                      ✓ {t("common.accept")}
                    </button>
                    <button
                      onClick={() => respond(r.id, "rejected")}
                      className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-2 text-sm font-semibold hover:bg-destructive/25"
                    >
                      ✕ {t("common.reject")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-2">
            {t("owner.map_title")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("owner.map_desc")}
          </p>
          <Suspense fallback={<div className="h-64 rounded-xl bg-secondary/40 animate-pulse" />}>
            <MobilityMap />
          </Suspense>
        </section>
        <div className="mt-6 flex justify-end">
          <SignalementDialog contextUrl="/owner" triggerLabel={t("owner.signalement_label")} />
        </div>
      </main>

      <FAQChatbot
        audience="owner"
        suggestions={[
          t("owner.faq_suggestion_1"),
          t("owner.faq_suggestion_2"),
          t("owner.faq_suggestion_3"),
          t("owner.faq_suggestion_4"),
          t("owner.faq_suggestion_5"),
        ]}
      />
    </div>
  );
}

function OwnerVehicleOnboarding() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: "✅",
      title: t("owner.onboarding_step1_title"),
      desc: t("owner.onboarding_step1_desc"),
      done: true,
      cta: null,
    },
    {
      icon: "🚗",
      title: t("owner.onboarding_step2_title"),
      desc: t("owner.onboarding_step2_desc"),
      done: false,
      cta: { label: t("owner.onboarding_step2_cta"), to: "/owner/vehicules/nouveau" } as const,
    },
    {
      icon: "🔍",
      title: t("owner.onboarding_step3_title"),
      desc: t("owner.onboarding_step3_desc"),
      done: false,
      cta: null,
    },
    {
      icon: "💳",
      title: t("owner.onboarding_step4_title"),
      desc: t("owner.onboarding_step4_desc"),
      done: false,
      cta: { label: t("owner.onboarding_step4_cta"), to: "/owner/stripe-connect" } as const,
    },
    {
      icon: "📣",
      title: t("owner.onboarding_step5_title"),
      desc: t("owner.onboarding_step5_desc"),
      done: false,
      cta: null,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🚀</div>
        <h2 className="font-display text-2xl font-bold">{t("owner.onboarding_title")}</h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t("owner.onboarding_desc")}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={i}
            className={`flex gap-4 rounded-xl p-4 transition ${
              step.done
                ? "bg-emerald-500/5 border border-emerald-500/20"
                : i === 1
                ? "bg-primary/5 border border-primary/20"
                : "bg-secondary/30 border border-border"
            }`}
          >
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                step.done
                  ? "bg-emerald-500/15 text-emerald-600"
                  : i === 1
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{step.icon} {step.title}</span>
                {step.done && (
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("owner.onboarding_step_done")}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              {step.cta && (
                <Link
                  to={step.cta.to}
                  className={`inline-block mt-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    i === 1
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {step.cta.label} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 pt-5 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {t("owner.onboarding_footer")}
        </p>
        <div className="flex justify-center gap-3 mt-3">
          <Link to="/owner/flotte/import" className="text-xs text-primary hover:underline font-medium">
            {t("owner.onboarding_import")}
          </Link>
          <Link to="/owner/flotte/qr" className="text-xs text-primary hover:underline font-medium">
            {t("owner.onboarding_qr")}
          </Link>
          <Link to="/owner/carte" className="text-xs text-primary hover:underline font-medium">
            {t("owner.onboarding_carte")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function OwnerRequestsEmpty({
  hasVehicles,
  hasApproved,
}: {
  hasVehicles: boolean;
  hasApproved: boolean;
}) {
  const { t } = useTranslation();

  if (!hasVehicles) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center max-w-lg mx-auto">
        <div className="text-3xl mb-3">🚗</div>
        <h3 className="font-semibold mb-1">{t("owner.no_vehicle_title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("owner.no_vehicle_desc")}
        </p>
        <Link
          to="/owner/vehicules/nouveau"
          className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {t("owner.add_vehicle")}
        </Link>
      </div>
    );
  }

  if (!hasApproved) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-10 text-center max-w-lg mx-auto">
        <div className="text-3xl mb-3">⏳</div>
        <h3 className="font-semibold mb-1">{t("owner.validation_pending_title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("owner.validation_pending_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center max-w-lg mx-auto">
      <div className="text-3xl mb-3">📭</div>
      <h3 className="font-semibold mb-1">{t("owner.no_requests_title")}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("owner.no_requests_desc")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("owner.no_requests_hint")}
      </p>
      <Link
        to="/owner/briefs"
        className="inline-block mt-3 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
      >
        {t("owner.open_briefs_link")}
      </Link>
    </div>
  );
}

function Tab({
  active,
  onClick,
  count,
  pendingCount,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
    >
      {children} <span className="opacity-60">({count})</span>
      {(pendingCount ?? 0) > 0 && (
        <span className="bg-signal text-white text-xs font-bold leading-none px-1.5 py-0.5 rounded-full">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

function OwnerVehicleCard({ v }: { v: Vehicle }) {
  const { t } = useTranslation();
  const photoUrls = useVehiclePhotoUrls(v.photos);
  const typeLabel = t(`vehicle_types.${v.type}`, { defaultValue: TYPE_LABELS[v.type] ?? v.type });
  const formatLabel = v.format_publicitaire === "boxled"
    ? t("owner.format_boxled")
    : (v.format_publicitaire || t(`owner.vehicle_formats.${v.type}`, "—"));
  const [pricing, setPricing] = useState<PricingRecommendation | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const handleGetPricing = async () => {
    setPricingLoading(true);
    try {
      const rec = await recommendVehiclePrice({ data: { vehicleId: v.id } });
      setPricing(rec);
    } catch {
      // silencieux
    } finally {
      setPricingLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {photoUrls[0] && (
        <div className="relative overflow-hidden rounded-lg mb-4 h-40 w-full">
          <img src={photoUrls[0]} alt={v.name} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 h-[22%] backdrop-blur-md bg-black/10 pointer-events-none" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-bold">{v.name}</h3>
        <StatusBadge status={v.status} />
      </div>

      {/* Type & format publicitaire */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{typeLabel}</span>
        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">{formatLabel}</span>
        {v.condition && (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{t(`owner.vehicle_condition.${v.condition}`, v.condition)}</span>
        )}
      </div>

      {/* Caractéristiques */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        {v.surface_m2 != null && <span>{t("owner.vehicle_surface", { value: v.surface_m2 })}</span>}
        {v.km_per_day != null && <span>{t("owner.vehicle_km_per_day", { value: v.km_per_day })}</span>}
      </div>

      {/* Zones */}
      {v.zones && v.zones.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {v.zones.map((z) => (
            <span key={z} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{z}</span>
          ))}
        </div>
      )}

      {/* Météo — conditions pose sur la zone principale, uniquement pour les véhicules disponibles */}
      {v.status === "approved" && v.zones && v.zones.length > 0 && (
        <WeatherInstallCheck zone={v.zones[0]} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="font-display text-xl font-bold text-primary">
          {t("owner.vehicle_price_day", { price: v.price_per_day })}
        </div>
        {v.status === "approved" && !pricing && (
          <button
            type="button"
            disabled={pricingLoading}
            onClick={handleGetPricing}
            className="text-xs px-3 py-1 rounded-full border border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 disabled:opacity-60 transition-colors"
          >
            {pricingLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 border-2 border-violet-400/30 border-t-violet-500 rounded-full animate-spin" />
                {t("owner.ai_pricing_loading")}
              </span>
            ) : t("owner.ai_pricing_cta")}
          </button>
        )}
      </div>

      {pricing && (
        <div className="mt-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-violet-700 dark:text-violet-300">{t("owner.ai_pricing_title", { price: pricing.suggested })}</span>
            <span className="text-muted-foreground">{t("owner.ai_pricing_range", { min: pricing.min, max: pricing.max })}</span>
            <button type="button" onClick={() => setPricing(null)} className="ml-auto text-muted-foreground hover:text-foreground text-[10px]">✕</button>
          </div>
          <p className="text-muted-foreground leading-relaxed">{pricing.rationale}</p>
          {pricing.factors.length > 0 && (
            <ul className="space-y-0.5 text-muted-foreground">
              {pricing.factors.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          )}
        </div>
      )}

      {v.admin_notes && (
        <div className="mt-3 text-xs rounded-lg bg-secondary/40 p-3 border border-border">
          <strong>{t("owner.note_label")}</strong> {v.admin_notes}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border">
        <Link
          to="/owner/vehicules/$vehicleId"
          params={{ vehicleId: v.id }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {t("owner.vehicle_edit_link")}
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
    paused: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    pending: t("owner.status_pending"),
    approved: t("owner.status_approved"),
    rejected: t("owner.status_rejected"),
    paused: t("owner.status_paused"),
  };
  const label = labels[status] ?? status;
  const c = cls[status] ?? "bg-secondary";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${c}`}>
      {label}
    </span>
  );
}

function ResponseBadge({ response }: { response: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    accepted: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
  };
  const labels: Record<string, string> = {
    pending: t("owner.response_pending"),
    accepted: t("owner.response_accepted"),
    rejected: t("owner.response_rejected"),
  };
  const label = labels[response] ?? response;
  const c = cls[response] ?? "bg-secondary";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${c}`}>
      {label}
    </span>
  );
}
