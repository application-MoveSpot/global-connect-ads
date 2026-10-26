import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { track } from "@/lib/analytics/track";
import { toast } from "sonner";
import { LogoLink } from "@/components/app/LogoLink";
import { pushNotification } from "@/hooks/useNotifications";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { CampaignTrialCheckout } from "@/components/advertiser/CampaignTrialCheckout";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import {
  RefreshCw,
  Wallet,
  FileText,
  Activity,
  Navigation,
  Sparkles,
  Loader2,
  Share2,
} from "lucide-react";
import { RouteError } from "@/components/app/RouteError";
import { acceptBriefProposal } from "@/lib/campaigns/brief-to-campaign.server";
import { rejectBriefProposal } from "@/lib/campaigns/brief-proposal-emails.server";
import { SignalementDialog } from "@/components/shared/SignalementDialog";
import { useTranslation } from "react-i18next";
import {
  compareProposals,
  type ProposalComparisonResult,
} from "@/lib/ai/proposal-comparison.functions";
import {
  suggestBriefAdjustments,
  type BriefReengagementResult,
} from "@/lib/ai/brief-reengagement.functions";

export const Route = createFileRoute("/advertiser/briefs/$briefId")({
  head: () => ({
    meta: [
      { title: "Détail du brief — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BriefDetailPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Brief = {
  id: string;
  advertiser_id: string;
  title: string;
  description: string;
  vehicle_types: string[];
  zones: string[];
  start_date: string;
  end_date: string;
  days_count: number | null;
  budget_max: number | null;
  poseur_fee: number | null;
  audience_target: string | null;
  creative_files: string[] | null;
  status: string;
};

type Proposal = {
  id: string;
  vehicle_id: string;
  owner_id: string;
  price_per_day: number;
  message: string | null;
  status: string;
  created_at: string;
};

type Vehicle = {
  id: string;
  name: string;
  type: string;
  photos: string[] | null;
  format_publicitaire: string | null;
  zones: string[];
};

type CampaignRequest = {
  id: string;
  status: string;
  payment_status: string;
  installation_status: string;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  vehicle_id: string | null;
};

function BriefDetailPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [accountType, setAccountType] = useState<string | null>(null);
  const [campaignRequests, setCampaignRequests] = useState<CampaignRequest[]>([]);
  // Maps proposalId → campaign_request.id (populated on accept)
  const [campaignRequestIds, setCampaignRequestIds] = useState<Record<string, string>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ProposalComparisonResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [reengagement, setReengagement] = useState<BriefReengagementResult | null>(null);
  const [reengagementLoading, setReengagementLoading] = useState(false);
  const [reengagementChecked, setReengagementChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const doAcceptProposal = useServerFn(acceptBriefProposal);
  const doRejectProposal = useServerFn(rejectBriefProposal);
  const doCompareProposals = useServerFn(compareProposals);
  const doSuggestAdjustments = useServerFn(suggestBriefAdjustments);

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/advertiser/inscription" });
      return;
    }
    const [{ data: b }, { data: prof }] = await Promise.all([
      supabase.from("advertiser_briefs").select("*").eq("id", briefId).maybeSingle(),
      supabase
        .from("advertiser_profiles")
        .select("account_type")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);
    if (!b) {
      navigate({ to: "/advertiser" });
      return;
    }
    setBrief(b as Brief);
    setAccountType((prof as { account_type?: string } | null)?.account_type ?? null);
    const [{ data: ps }, { data: crs }] = await Promise.all([
      supabase
        .from("brief_proposals")
        .select("*")
        .eq("brief_id", briefId)
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_requests")
        .select(
          "id, status, payment_status, installation_status, start_date, end_date, total_price, vehicle_id",
        )
        .eq("spot_id", briefId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false }),
    ]);
    const list = (ps as Proposal[]) ?? [];
    setProposals(list);
    setCampaignRequests((crs as CampaignRequest[]) ?? []);
    const vehicleIds = [
      ...list.map((p) => p.vehicle_id),
      ...((crs as CampaignRequest[]) ?? [])
        .filter((c) => c.vehicle_id)
        .map((c) => c.vehicle_id as string),
    ];
    if (vehicleIds.length > 0) {
      const { data: vs } = await supabase
        .from("vehicles")
        .select("id, name, type, photos, format_publicitaire, zones")
        .in("id", vehicleIds);
      const map: Record<string, Vehicle> = {};
      for (const v of (vs as Vehicle[]) ?? []) map[v.id] = v;
      setVehicles(map);
    }
    setLoading(false);
  }, [briefId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Stable ref so the realtime callback always calls the latest `load`
  const loadRef = useRef(load);
  loadRef.current = load;

  // Realtime: new proposals arrive while the advertiser has this page open
  useEffect(() => {
    const channel = supabase
      .channel(`advertiser-brief-detail-${briefId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brief_proposals",
          filter: `brief_id=eq.${briefId}`,
        },
        () => {
          pushNotification(
            t("advertiser.briefs.detail.notif_new_proposal"),
            t("advertiser.briefs.detail.notif_new_proposal_body"),
          );
          void loadRef.current();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "brief_proposals",
          filter: `brief_id=eq.${briefId}`,
        },
        () => {
          void loadRef.current();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [briefId]);

  // Auto-trigger re-engagement suggestions for individuals: brief open ≥48h, ≤1 proposal
  useEffect(() => {
    if (!brief || accountType !== "individual" || reengagementChecked) return;
    if (brief.status !== "open") return;
    const created = new Date(
      (brief as Brief & { created_at?: string }).created_at ?? brief.start_date,
    );
    const hoursElapsed = (Date.now() - created.getTime()) / 3_600_000;
    if (hoursElapsed < 48 || proposals.length > 1) return;
    setReengagementChecked(true);
    setReengagementLoading(true);
    void doSuggestAdjustments({
      data: {
        title: brief.title,
        description: brief.description,
        vehicleTypes: brief.vehicle_types,
        zones: brief.zones,
        budgetMax: brief.budget_max ?? undefined,
        daysCount: brief.days_count ?? undefined,
        startDate: brief.start_date,
        endDate: brief.end_date,
        proposalCount: proposals.length,
        hoursElapsed,
      },
    })
      .then((r: BriefReengagementResult | null) => setReengagement(r))
      .catch(() => {
        /* silent */
      })
      .finally(() => setReengagementLoading(false));
  }, [brief, accountType, proposals.length, reengagementChecked, doSuggestAdjustments]);

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const avgPricePerDay = acceptedProposals.length
    ? acceptedProposals.reduce((s, p) => s + Number(p.price_per_day ?? 0), 0) /
      acceptedProposals.length
    : 0;
  const estimatedTotal = acceptedProposals.reduce(
    (s, p) => s + Number(p.price_per_day ?? 0) * (brief?.days_count ?? 0),
    0,
  );

  const respond = async (id: string, status: "accepted" | "rejected") => {
    if (status === "rejected") {
      await doRejectProposal({ data: { proposalId: id, briefId } });
      void track("proposal_rejected", { proposal_id: id, brief_id: briefId });
      await load();
      return;
    }

    // Accepted: create campaign_request via server function
    setRespondingId(id);
    try {
      const result = await doAcceptProposal({ data: { proposalId: id, briefId } });
      void track("proposal_accepted", {
        proposal_id: id,
        brief_id: briefId,
        campaign_request_id: result.campaignRequestId,
      });
      setCampaignRequestIds((prev) => ({ ...prev, [id]: result.campaignRequestId }));

      if (result.settled) {
        toast.success(t("advertiser.briefs.detail.toast_activated"));
      } else if (result.insufficientFunds) {
        toast.warning(t("advertiser.briefs.detail.toast_recharge_needed"));
      }

      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("advertiser.briefs.detail.toast_error"));
    } finally {
      setRespondingId(null);
    }
  };

  const cancelBrief = async () => {
    if (!confirm(t("advertiser.briefs.detail.cancel_confirm"))) return;
    await supabase.from("advertiser_briefs").update({ status: "cancelled" }).eq("id", briefId);
    await load();
  };

  const isIndividual = accountType === "individual";

  const daysUntilStart = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(brief?.start_date ?? "");
    start.setHours(0, 0, 0, 0);
    return Math.round((start.getTime() - today.getTime()) / 86400000);
  })();

  if (loading || !brief)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("advertiser.briefs.detail.loading")}
      </div>
    );

  const pendingCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex items-center gap-3">
            {brief.status === "open" && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(`${window.location.origin}/_public/brief/${briefId}`)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    })
                    .catch(() => {});
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <Share2 className="w-4 h-4" />
                {copied
                  ? t("advertiser.briefs.detail.share_copied")
                  : t("advertiser.briefs.detail.share")}
              </button>
            )}
            <Link
              to="/advertiser/briefs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("advertiser.briefs.detail.back")}
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Compte à rebours événement pour les particuliers */}
        {isIndividual && brief.status === "open" && daysUntilStart > 0 && (
          <div
            className={`mb-5 rounded-xl px-4 py-3 flex items-center gap-3 ${daysUntilStart <= 7 ? "bg-amber-500/10 border border-amber-500/30" : "bg-primary/5 border border-primary/20"}`}
          >
            <span className="text-2xl">{daysUntilStart <= 7 ? "⏰" : "📅"}</span>
            <div>
              <p
                className={`text-sm font-semibold ${daysUntilStart <= 7 ? "text-amber-700 dark:text-amber-300" : "text-primary"}`}
              >
                {daysUntilStart <= 7
                  ? t("advertiser.briefs.detail.countdown_urgent", { count: daysUntilStart })
                  : t("advertiser.briefs.detail.countdown_j_minus", { count: daysUntilStart })}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("advertiser.briefs.detail.countdown_proposals", { count: pendingCount })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Re-engagement tips for individuals with no traction */}
        {isIndividual && (reengagementLoading || reengagement) && (
          <div
            className={`mb-5 rounded-xl border px-4 py-4 space-y-3 ${reengagementLoading ? "border-border bg-secondary/20 animate-pulse" : "border-amber-500/30 bg-amber-500/5"}`}
          >
            {reengagementLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{t("advertiser.briefs.detail.reengagement_loading")}</span>
              </div>
            ) : reengagement ? (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {t("advertiser.briefs.detail.reengagement_title")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {reengagement.summary}
                </p>
                <div className="space-y-2">
                  {reengagement.tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2.5"
                    >
                      <span className="text-base shrink-0">{tip.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/advertiser/briefs/$briefId/modifier"
                  params={{ briefId }}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline"
                >
                  {t("advertiser.briefs.detail.reengagement_edit_btn")} →
                </Link>
              </>
            ) : null}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{brief.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("advertiser.briefs.detail.date_period", {
                from: new Date(brief.start_date).toLocaleDateString(dateLocale),
                to: new Date(brief.end_date).toLocaleDateString(dateLocale),
                count: brief.days_count ?? 0,
              })}
            </p>
          </div>
          <StatusBadge status={brief.status} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
          <p className="text-sm whitespace-pre-wrap">{brief.description}</p>
          <div className="text-xs text-muted-foreground">
            <strong>{t("advertiser.briefs.detail.vehicle_types_label")}</strong>{" "}
            {brief.vehicle_types.join(", ")}
          </div>
          {brief.zones.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <strong>{t("advertiser.briefs.detail.zones_label")}</strong> {brief.zones.join(", ")}
            </div>
          )}
          {brief.budget_max && (
            <div className="text-xs text-muted-foreground">
              <strong>{t("advertiser.briefs.detail.budget_label")}</strong> {brief.budget_max}€/jour
            </div>
          )}
          {brief.poseur_fee && (
            <div className="text-xs text-muted-foreground">
              <strong>{t("advertiser.briefs.detail.poseur_fee_label")}</strong> {brief.poseur_fee}€ {t("advertiser.briefs.detail.poseur_fee_suffix")}
            </div>
          )}
          {brief.audience_target && (
            <div className="text-xs text-muted-foreground">
              <strong>{t("advertiser.briefs.detail.audience_label")}</strong>{" "}
              {brief.audience_target}
            </div>
          )}
          <CreativeFiles paths={brief.creative_files} />
        </section>

        {acceptedProposals.length > 0 && (
          <section className="rounded-2xl border border-primary/40 bg-primary/5 p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="font-display text-2xl font-bold">
                {t("advertiser.briefs.detail.devis_title")}
              </h2>
              <Link
                to="/advertiser/contrat/$briefId"
                params={{ briefId }}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
              >
                <FileText className="h-4 w-4" />
                {t("advertiser.briefs.detail.devis_pdf_btn")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t("advertiser.briefs.detail.devis_config_ok")}
            </p>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t("advertiser.briefs.detail.devis_vehicles_accepted")}
                </dt>
                <dd className="font-semibold">{acceptedProposals.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t("advertiser.briefs.detail.devis_duration")}
                </dt>
                <dd className="font-semibold">
                  {t("advertiser.briefs.detail.devis_duration_value", {
                    count: brief.days_count ?? 0,
                  })}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {t("advertiser.briefs.detail.devis_avg_price")}
                </dt>
                <dd className="font-semibold">{avgPricePerDay.toFixed(2)} €</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2 mt-2">
                <dt className="font-semibold">{t("advertiser.briefs.detail.devis_total")}</dt>
                <dd className="font-display text-lg font-bold text-primary">
                  {estimatedTotal.toFixed(2)} €
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                {isIndividual
                  ? t("advertiser.briefs.detail.activate_title_individual")
                  : t("advertiser.briefs.detail.activate_title_business")}
              </p>

              {isIndividual ? (
                <div className="rounded-xl border border-primary bg-primary/5 p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-sm">
                      {t("advertiser.briefs.detail.wallet_title")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {t("advertiser.briefs.detail.wallet_desc")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/advertiser/portefeuille"
                      className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition"
                    >
                      {t("advertiser.briefs.detail.wallet_btn")}
                    </Link>
                    <Link
                      to="/advertiser/pack"
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition"
                    >
                      {t("advertiser.briefs.detail.wallet_pack_btn")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-primary bg-primary/5 p-4 ring-1 ring-primary/30">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">
                        {t("advertiser.briefs.detail.trial_title")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {t("advertiser.briefs.detail.trial_desc", {
                        count: acceptedProposals.length,
                        n: acceptedProposals.length,
                      })}
                    </p>
                    <CampaignTrialCheckout
                      campaignRequestId={
                        // Use the first accepted proposal's campaign_request.id if available
                        campaignRequestIds[acceptedProposals[0]?.id] ?? brief.id
                      }
                      vehicleQuantity={acceptedProposals.length}
                      buttonLabel={t("advertiser.briefs.detail.trial_btn")}
                      className="w-full"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        {t("advertiser.briefs.detail.wallet_title")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {t("advertiser.briefs.detail.wallet_desc")}
                    </p>
                    <Link
                      to="/advertiser/portefeuille"
                      className="block w-full rounded-lg border border-border bg-secondary px-4 py-2 text-center text-sm font-semibold hover:bg-secondary/70 transition"
                    >
                      {t("advertiser.briefs.detail.wallet_btn")} →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {brief.status === "open" && (
          <button onClick={cancelBrief} className="mb-6 text-xs text-destructive hover:underline">
            {t("advertiser.briefs.detail.cancel_btn")}
          </button>
        )}

        {campaignRequests.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("advertiser.briefs.detail.campaigns_title", { count: campaignRequests.length })}
            </h2>
            <div className="space-y-3">
              {campaignRequests.map((cr) => {
                const vehicle = cr.vehicle_id ? vehicles[cr.vehicle_id] : null;
                return (
                  <div key={cr.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {vehicle?.name ?? t("advertiser.briefs.detail.vehicle_default")}
                        </p>
                        {cr.start_date && cr.end_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(cr.start_date).toLocaleDateString(dateLocale)} →{" "}
                            {new Date(cr.end_date).toLocaleDateString(dateLocale)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <CampaignStatusBadge status={cr.status} />
                          <PaymentStatusBadge status={cr.payment_status} />
                          <InstallBadge status={cr.installation_status} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {cr.total_price != null && (
                          <span className="font-display font-bold text-base">
                            {cr.total_price.toFixed(2)} €
                          </span>
                        )}
                        <div className="flex gap-2">
                          <Link
                            to="/advertiser/suivi/$campaignId"
                            params={{ campaignId: cr.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition"
                          >
                            <Navigation className="h-3 w-3" />
                            {t("advertiser.briefs.detail.gps_btn")}
                          </Link>
                          <Link
                            to="/advertiser/rapport/$campaignId"
                            params={{ campaignId: cr.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition"
                          >
                            {t("advertiser.briefs.detail.report_btn")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <h2 className="font-display text-2xl font-bold mb-4">
          {isIndividual
            ? t("advertiser.briefs.detail.proposals_title_individual", { count: proposals.length })
            : t("advertiser.briefs.detail.proposals_title_business", { count: proposals.length })}
        </h2>

        {/* AI proposal comparison for individuals with ≥2 pending proposals */}
        {isIndividual && proposals.filter((p) => p.status === "pending").length >= 2 && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 space-y-3">
            {comparisonLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{t("advertiser.briefs.detail.comparison_loading")}</span>
              </div>
            ) : comparison ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold">
                      {t("advertiser.briefs.detail.comparison_title")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparison(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {comparison.summary}
                </p>
                <div className="space-y-2">
                  {comparison.items.map((item) => {
                    const proposal = proposals.find((p) => p.id === item.id);
                    const veh = proposal ? vehicles[proposal.vehicle_id] : null;
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border bg-background/60 px-3 py-2.5 text-xs space-y-1"
                      >
                        <p className="font-semibold text-sm">
                          {veh?.name ?? t("advertiser.briefs.detail.vehicle_fallback")}
                        </p>
                        {item.pros.length > 0 && (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            {item.pros.map((pro, i) => (
                              <span key={i} className="block">
                                ✓ {pro}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.cons.length > 0 && (
                          <div className="text-amber-600 dark:text-amber-400">
                            {item.cons.map((con, i) => (
                              <span key={i} className="block">
                                ⚠ {con}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.verdict && (
                          <p className="text-muted-foreground italic">{item.verdict}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
                  <span className="font-semibold text-primary">💡 </span>
                  <span className="text-foreground">{comparison.recommendation}</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setComparisonLoading(true);
                  try {
                    const pendingProposals = proposals.filter((p) => p.status === "pending");
                    const result = await doCompareProposals({
                      data: {
                        proposals: pendingProposals.map((p) => ({
                          id: p.id,
                          vehicleName:
                            vehicles[p.vehicle_id]?.name ??
                            t("advertiser.briefs.detail.vehicle_fallback"),
                          vehicleType: vehicles[p.vehicle_id]?.type ?? "",
                          pricePerDay: Number(p.price_per_day),
                          totalPrice: Number(p.price_per_day) * (brief.days_count ?? 1),
                          message: p.message ?? undefined,
                        })),
                        briefTitle: brief.title,
                        briefDays: brief.days_count ?? undefined,
                        briefBudgetMax: brief.budget_max ?? undefined,
                      },
                    });
                    setComparison(result);
                  } catch {
                    toast.error(t("advertiser.briefs.detail.comparison_error"));
                  } finally {
                    setComparisonLoading(false);
                  }
                }}
                className="w-full flex items-center gap-2.5 rounded-lg hover:bg-primary/10 transition px-2 py-1.5 text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {t("advertiser.briefs.detail.comparison_cta")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("advertiser.briefs.detail.comparison_cta_sub", {
                      count: proposals.filter((p) => p.status === "pending").length,
                    })}
                  </p>
                </div>
              </button>
            )}
          </div>
        )}

        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            {isIndividual
              ? t("advertiser.briefs.detail.proposals_empty_individual")
              : t("advertiser.briefs.detail.proposals_empty_business")}
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const v = vehicles[p.vehicle_id];
              const totalForBrief = Number(p.price_per_day) * (brief.days_count ?? 0);
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-4">
                    {v?.photos?.[0] && <VehicleThumb src={v.photos[0]} alt={v.name} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold">
                              {v?.name ?? t("advertiser.briefs.detail.vehicle_fallback")}
                            </div>
                            {v && brief.zones.length > 0 && !v.zones?.some((z) =>
                              brief.zones.some((bz) =>
                                bz.toLowerCase().includes(z.toLowerCase()) ||
                                z.toLowerCase().includes(bz.toLowerCase())
                              )
                            ) && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                ⚠️ {t("advertiser.briefs.detail.zone_mismatch_badge")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {v?.type} {v?.format_publicitaire && `· ${v.format_publicitaire}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-lg font-bold text-primary">
                            {p.price_per_day}€
                            <span className="text-xs font-normal text-muted-foreground">/jour</span>
                          </div>
                          {isIndividual && brief.days_count && (
                            <div className="text-xs text-muted-foreground">
                              {t("advertiser.briefs.detail.total_for_brief", {
                                total: totalForBrief.toFixed(0),
                              })}
                            </div>
                          )}
                          <ProposalBadge status={p.status} />
                        </div>
                      </div>
                      {p.message && <p className="text-sm mt-2 whitespace-pre-wrap">{p.message}</p>}
                      {p.status === "pending" && brief.status === "open" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => respond(p.id, "accepted")}
                            disabled={respondingId === p.id}
                            className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-1.5 text-sm font-semibold hover:bg-signal/30 disabled:opacity-50"
                          >
                            {respondingId === p.id
                              ? "…"
                              : isIndividual
                                ? t("advertiser.briefs.detail.accept_individual")
                                : t("advertiser.briefs.detail.accept_business")}
                          </button>
                          <button
                            onClick={() => respond(p.id, "rejected")}
                            disabled={respondingId === p.id}
                            className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-1.5 text-sm font-semibold hover:bg-destructive/25 disabled:opacity-50"
                          >
                            {t("advertiser.briefs.detail.reject")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-border flex justify-end">
          <SignalementDialog
            contextUrl={`/advertiser/briefs/${briefId}`}
            triggerLabel={t("advertiser.briefs.detail.report_problem")}
          />
        </div>
      </main>
    </div>
  );
}

function VehicleThumb({ src, alt }: { src: string; alt: string }) {
  const [url] = useVehiclePhotoUrls([src]);
  if (!url) return null;
  return (
    <div className="relative overflow-hidden rounded-lg flex-shrink-0 w-24 h-24">
      <img src={url} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 h-[22%] backdrop-blur-md bg-black/10 pointer-events-none" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    open: "bg-signal/20 text-signal",
    closed: "bg-secondary text-foreground",
    fulfilled: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/15 text-destructive",
  };
  const label = t(`advertiser.briefs.detail.status_${status}` as never, { defaultValue: status });
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls[status] ?? "bg-secondary"}`}
    >
      {label}
    </span>
  );
}

function ProposalBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    accepted: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
    withdrawn: "bg-muted text-muted-foreground",
  };
  const label = t(`advertiser.briefs.detail.proposal_${status}` as never, { defaultValue: status });
  return (
    <span
      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls[status] ?? "bg-secondary"}`}
    >
      {label}
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    active: "bg-signal/20 text-signal",
    completed: "bg-secondary text-muted-foreground",
    cancelled: "bg-destructive/15 text-destructive",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label = t(`advertiser.briefs.detail.campaign_${status}` as never, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls[status] ?? "bg-secondary"}`}
    >
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    paid: "bg-signal/15 text-signal",
    refunded: "bg-secondary text-muted-foreground",
  };
  const label = t(`advertiser.briefs.detail.payment_${status}` as never, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls[status] ?? "bg-secondary"}`}
    >
      {label}
    </span>
  );
}

function InstallBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls: Record<string, string> = {
    pending: "bg-secondary text-muted-foreground",
    scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    completed: "bg-signal/15 text-signal",
    approved: "bg-signal/15 text-signal",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label = t(`advertiser.briefs.detail.install_${status}` as never, { defaultValue: status });
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls[status] ?? "bg-secondary"}`}
    >
      {label}
    </span>
  );
}
