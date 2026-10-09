import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
import { CampaignMetricsRow } from "@/components/advertiser/CampaignMetricsRow";
import { RouteError } from "@/components/app/RouteError";
import { OnboardingModal } from "@/components/advertiser/OnboardingModal";
import { getMyReferralStats } from "@/lib/referral/advertiser-referral.functions";
import { firePixelEvent } from "@/lib/analytics/pixels";

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

type Profile = { full_name: string; company: string | null; account_type: string | null };

type Step = {
  icon: string;
  title: string;
  desc: string;
  done: boolean;
  cta: { label: string; to: string; hash?: string } | null;
};

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [paying, setPaying] = useState<string | null>(null);
  const isIndividual = profile?.account_type === "individual";
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
      .select("full_name, company, account_type")
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
            : t("errors.network"),
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
      toast.error(t("annonceur.insufficient_balance", { missing: ((cents - balanceCents) / 100).toFixed(2) }));
      navigate({ to: "/annonceur/portefeuille" });
      return;
    }
    setPaying(r.id);
    try {
      await payFn({ data: { campaignRequestId: r.id } });
      void track("campaign_paid", { campaign_request_id: r.id, total_price: r.total_price });
      firePixelEvent("Purchase", { value: (r.total_price ?? 0) / 100, currency: "EUR", content_name: "campaign" });
      toast.success(t("annonceur.payment_success"));
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) await reload(sess.session.user.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("annonceur.payment_failed"));
    } finally {
      setPaying(null);
    }
  };

  const dateLocale = i18n.language;

  if (loading && !loadError)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal isIndividual={isIndividual} />
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {profile?.full_name}
              {profile?.company ? ` · ${profile.company}` : ""}
            </span>
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram MoveSpot"
              className="rounded-full p-2 hover:bg-secondary transition text-muted-foreground hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <Link
              to="/parametres"
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary transition"
            >
              {t("common.settings")}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="text-sm rounded-full border border-border px-4 py-2 hover:bg-secondary transition"
            >
              {t("common.logout")}
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

      <main id="main-content" className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("annonceur.my_campaigns")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("annonceur.campaigns_subtitle")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/annonceur/portefeuille"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              {t("annonceur.nav.wallet", { balance: (balanceCents / 100).toFixed(2) })}
            </Link>
            {isIndividual ? (
              <>
                <Link
                  to="/annonceur/pack"
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
                >
                  {t("annonceur.nav.packs")}
                </Link>
                <Link
                  to="/annonceur/exemples"
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
                >
                  {t("annonceur.nav.examples")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/prestataires"
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
                >
                  {t("annonceur.nav.providers")}
                </Link>
                <Link
                  to="/annonceur/etude-marche"
                  className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
                >
                  {t("annonceur.nav.market_study")}
                </Link>
              </>
            )}
            <Link
              to="/annonceur/briefs"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              {t("annonceur.nav.briefs")}
            </Link>
            <Link
              to="/annonceur/remboursement"
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
            >
              {t("annonceur.nav.refunds")}
            </Link>
            <Link
              to="/annonceur/briefs/nouveau"
              className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
            >
              {isIndividual ? t("annonceur.nav.new_brief") : t("annonceur.nav.new_campaign")}
            </Link>
            {!isIndividual && (
              <Link
                to="/"
                hash="spots"
                className="rounded-full border border-primary/40 bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/20 transition"
              >
                {t("annonceur.nav.browse_spots")}
              </Link>
            )}
            {requests.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition"
              >
                {t("common.export_csv")}
              </button>
            )}
          </div>
        </div>

        {/* ── Card contextuelle selon profil ── */}
        {isIndividual ? (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="text-4xl flex-shrink-0">🎉</div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-semibold text-base mb-1">
                {t("annonceur.promo_individual.title")}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {t("annonceur.promo_individual.subtitle")}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Link
                  to="/annonceur/briefs/nouveau"
                  className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
                >
                  {t("annonceur.promo_individual.cta_brief")}
                </Link>
                <Link
                  to="/annonceur/pack"
                  className="rounded-full border border-primary/40 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/10 transition"
                >
                  {t("annonceur.promo_individual.cta_packs")}
                </Link>
                <Link
                  to="/annonceur/exemples"
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition"
                >
                  {t("annonceur.promo_individual.cta_examples")}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mb-8 rounded-2xl overflow-hidden border border-border relative"
            style={{ background: "linear-gradient(135deg, #0a0a14 0%, #0d1220 60%, #0f0f1a 100%)" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 75% 50%, rgba(40,100,255,0.10) 0%, transparent 70%)",
              }}
            />
            <div className="relative flex flex-col sm:flex-row items-center gap-6 px-6 py-7">
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  width: 90,
                  height: 64,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ position: "relative", width: 82, height: 44 }}>
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
                    {t("annonceur.promo_led.badge")}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {t("annonceur.promo_led.title")}
                </h2>
                <p className="text-sm mb-3" style={{ color: "rgba(180,200,240,0.7)" }}>
                  {t("annonceur.promo_led.subtitle")}
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Link
                    to="/annonceur/briefs/nouveau"
                    className="rounded-full px-5 py-2 text-sm font-semibold transition"
                    style={{ background: "rgba(60,120,255,0.85)", color: "#fff" }}
                  >
                    {t("annonceur.promo_led.cta_brief")}
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
                    {t("annonceur.promo_led.cta_rates")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <AdvertiserOnboarding isIndividual={isIndividual} />
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
                      {new Date(r.created_at).toLocaleDateString(dateLocale)}
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
                    <strong>{t("common.reason_label")}</strong> {r.admin_notes}
                  </div>
                )}
                <StatusHistory
                  entityType="campaign_status"
                  entityId={r.id}
                  statusLabel={{ pending: t("annonceur.campaign.status_pending"), approved: t("annonceur.campaign.status_approved"), rejected: t("annonceur.campaign.status_rejected") }}
                  triggerLabel={t("annonceur.campaign.status_history_label")}
                />
                <RouteSummary
                  zones={r.route_zones}
                  waypoints={r.route_waypoints}
                  pois={r.route_pois}
                  impressionsPerDay={r.estimated_impressions_per_day}
                  days={r.days_count}
                />
                <CreativeFiles paths={r.creative_files} />
                <CampaignMetricsRow
                  campaignId={r.id}
                  status={r.status}
                  paymentStatus={r.payment_status}
                />
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
                          ? t("annonceur.paying")
                          : `${t("annonceur.pay_with_wallet")} (${Number(r.total_price).toFixed(2)} €)`}
                      </button>
                    )}
                    <Link
                      to="/annonceur/suivi/$campaignId"
                      params={{ campaignId: r.id }}
                      className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition"
                    >
                      {t("annonceur.campaign.track")}
                    </Link>
                    {r.payment_status === "paid" && (
                      <Link
                        to="/annonceur/facture/$campaignId"
                        params={{ campaignId: r.id }}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
                      >
                        {t("annonceur.campaign.invoice")}
                      </Link>
                    )}
                    {(r.installation_status === "approved" || r.installation_status === "pending_approval") && (
                      <Link
                        to="/annonceur/suivi/$campaignId"
                        params={{ campaignId: r.id }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${r.installation_status === "approved" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20" : "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"}`}
                      >
                        📸 {r.installation_status === "approved" ? t("annonceur.campaign.installation_approved") : t("annonceur.campaign.installation_pending")}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-2">
            {t("annonceur.map_title")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("annonceur.map_desc")}
          </p>
          <MobilityMap />
        </section>

        <section className="mt-12">
          <ReferralWidget />
        </section>

        <div className="mt-10 rounded-xl border border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
          {t("annonceur.ip_notice")}
        </div>
      </main>
      <FAQChatbot
        audience="annonceur"
        userContext={[
          `Solde portefeuille : ${(balanceCents / 100).toFixed(2)} €`,
          `Type de compte : ${isIndividual ? "particulier / événementiel" : "entreprise / professionnel"}`,
        ].join("\n")}
        suggestions={
          isIndividual
            ? [
                "Quel pack choisir pour mon mariage ?",
                "Combien de temps avant l'événement dois-je publier ?",
                "Comment choisir la zone de diffusion ?",
                "Puis-je annuler si personne n'accepte mon brief ?",
                "Comment fonctionne le paiement par portefeuille ?",
              ]
            : [
                "Comment payer ma campagne validée ?",
                "Combien de temps dure la validation de ma campagne ?",
                "Quels contenus publicitaires sont interdits ?",
                "Comment recharger mon portefeuille ?",
                "À quoi sert un brief ?",
              ]
        }
      />
    </div>
  );
}

function AdvertiserOnboarding({ isIndividual }: { isIndividual: boolean }) {
  const { t } = useTranslation();

  const stepsIndividual = [
    {
      icon: "✅",
      title: t("annonceur.onboarding.step_i1_title"),
      desc: t("annonceur.onboarding.step_i1_desc"),
      done: true,
      cta: null,
    },
    {
      icon: "🎪",
      title: t("annonceur.onboarding.step_i2_title"),
      desc: t("annonceur.onboarding.step_i2_desc"),
      done: false,
      cta: { label: t("annonceur.onboarding.step_i2_cta"), to: "/annonceur/pack" } as const,
    },
    {
      icon: "📋",
      title: t("annonceur.onboarding.step_i3_title"),
      desc: t("annonceur.onboarding.step_i3_desc"),
      done: false,
      cta: { label: t("annonceur.onboarding.step_i3_cta"), to: "/annonceur/briefs/nouveau" } as const,
    },
    {
      icon: "🚗",
      title: t("annonceur.onboarding.step_i4_title"),
      desc: t("annonceur.onboarding.step_i4_desc"),
      done: false,
      cta: null,
    },
  ] satisfies Step[];

  const stepsBusiness = [
    {
      icon: "✅",
      title: t("annonceur.onboarding.step_b1_title"),
      desc: t("annonceur.onboarding.step_b1_desc"),
      done: true,
      cta: null,
    },
    {
      icon: "🔍",
      title: t("annonceur.onboarding.step_b2_title"),
      desc: t("annonceur.onboarding.step_b2_desc"),
      done: false,
      cta: { label: t("annonceur.onboarding.step_b2_cta"), to: "/", hash: "spots" } as const,
    },
    {
      icon: "📋",
      title: t("annonceur.onboarding.step_b3_title"),
      desc: t("annonceur.onboarding.step_b3_desc"),
      done: false,
      cta: { label: t("annonceur.onboarding.step_b3_cta"), to: "/annonceur/briefs/nouveau" } as const,
    },
    {
      icon: "🚀",
      title: t("annonceur.onboarding.step_b4_title"),
      desc: t("annonceur.onboarding.step_b4_desc"),
      done: false,
      cta: null,
    },
  ] satisfies Step[];

  const steps = isIndividual ? stepsIndividual : stepsBusiness;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">{isIndividual ? "🎉" : "📣"}</div>
        <h2 className="font-display text-2xl font-bold">
          {isIndividual ? t("annonceur.onboarding.title_individual") : t("annonceur.onboarding.title_business")}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {isIndividual ? t("annonceur.onboarding.subtitle_individual") : t("annonceur.onboarding.subtitle_business")}
        </p>
        {isIndividual && (
          <Link
            to="/annonceur/exemples"
            className="inline-block mt-3 text-xs text-primary hover:underline"
          >
            {t("annonceur.onboarding.see_examples")}
          </Link>
        )}
      </div>

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className={`flex gap-4 rounded-xl p-4 transition ${step.done ? "bg-emerald-500/5 border border-emerald-500/20" : i === 1 ? "bg-primary/5 border border-primary/20" : "bg-secondary/30 border border-border"}`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${step.done ? "bg-emerald-500/15 text-emerald-600" : i === 1 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {step.done ? "✓" : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{step.icon} {step.title}</span>
                {step.done && (
                  <span className="text-xs text-emerald-600 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{t("annonceur.onboarding.done")}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              {step.cta && "hash" in step.cta ? (
                <Link
                  to={step.cta.to}
                  hash={step.cta.hash}
                  className="inline-block mt-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition"
                >
                  {step.cta.label} →
                </Link>
              ) : step.cta ? (
                <Link
                  to={step.cta.to}
                  className="inline-block mt-2 rounded-full border border-primary/40 text-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary/10 transition"
                >
                  {step.cta.label} →
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 pt-5 border-t border-border flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">
          {isIndividual ? t("annonceur.onboarding.wallet_tip_individual") : t("annonceur.onboarding.wallet_tip_business")}
        </p>
        <Link
          to="/annonceur/portefeuille"
          className="text-xs text-primary font-semibold hover:underline"
        >
          {t("annonceur.onboarding.load_wallet")}
        </Link>
      </div>
    </div>
  );
}

function ReferralWidget() {
  const { t } = useTranslation();
  const statsFn = useServerFn(getMyReferralStats);
  const [code, setCode] = useState<string | null>(null);
  const [credited, setCredited] = useState(0);
  const [pending, setPending] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (statsFn({}) as Promise<{ ok: false } | { ok: true; referralCode: string; rewards: Array<{ id: string; status: string; credited_at: string | null; created_at: string }> }>).then((res) => {
      if (!res.ok) return;
      setCode(res.referralCode);
      setCredited(res.rewards.filter((r) => r.status === "credited").length);
      setPending(res.rewards.filter((r) => r.status === "pending").length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inviteUrl = code ? `${window.location.origin}/annonceur/inscription?invite=${code}` : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — select text fallback
    }
  };

  if (!code) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">🎁 {t("annonceur.referral.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-md">{t("annonceur.referral.desc")}</p>
        </div>
        <div className="flex gap-4 text-center shrink-0">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-3">
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{credited}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t("annonceur.referral.credited")}</div>
          </div>
          {pending > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-5 py-3">
              <div className="text-2xl font-bold text-amber-600 tabular-nums">{pending}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("annonceur.referral.pending")}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0 rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-sm font-mono truncate select-all">
          {inviteUrl}
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {copied ? t("annonceur.referral.copied") : t("annonceur.referral.copy")}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("annonceur.referral.bonus_detail")}</p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-signal/20 text-signal",
    rejected: "bg-destructive/20 text-destructive",
  };
  const label = t(`campaign_status.${status}`, { defaultValue: status });
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls[status] ?? cls.pending}`}>{label}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    unpaid: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    paid: "bg-signal/20 text-signal",
    refunded: "bg-secondary text-foreground",
    partial_refund: "bg-secondary text-foreground",
  };
  const labels: Record<string, string> = {
    unpaid: t("payment_status.unpaid"),
    paid: `${t("payment_status.paid")} ✓`,
    refunded: t("payment_status.refunded"),
    partial_refund: t("payment_status.refunded"),
  };
  const label = labels[status] ?? status;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls[status] ?? cls.unpaid}`}>{label}</span>;
}

function SubscriptionBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; cls: string }> = {
    trialing: { label: t("common.status.active"), cls: "bg-signal/20 text-signal" },
    active: { label: t("common.status.active"), cls: "bg-signal/20 text-signal" },
    past_due: { label: t("common.status.pending"), cls: "bg-destructive/20 text-destructive" },
    unpaid: { label: t("payment_status.unpaid"), cls: "bg-destructive/20 text-destructive" },
    canceled: { label: t("common.status.cancelled"), cls: "bg-secondary text-foreground" },
    incomplete: { label: t("common.status.pending"), cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  };
  const s = map[status];
  if (!s) return null;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}
