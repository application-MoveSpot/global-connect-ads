import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { Button } from "@/components/ui/button";
import {
  adminAnalyticsData,
  adminApproveBrief,
  adminApproveCampaign,
  adminCertifyPoseur,
  adminFleetLatestPositions,
  adminListBriefsAndCampaigns,
  adminListInstallations,
  adminListInactiveStripeAccounts,
  adminListPoseurs,
  adminListVehicles,
  adminRevenueData,
  adminListUsers,
  adminReviewInstallation,
  adminReviewDepose,
  adminListDeposePending,
  adminReviewVehicle,
  adminSendStripeReminder,
} from "@/lib/admin.functions";
import {
  transferToPoseInstaller,
  transferToDeposeInstaller,
} from "@/lib/campaigns/installer-payout.functions";
import type { AdminUserRow } from "@/lib/admin.functions";
import {
  InstallationPhotoGrid,
  parseInstallationPhotos,
} from "@/components/driver/InstallationPhotoGrid";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { VigilanceAdminPanel } from "@/components/admin/VigilanceAdminPanel";
import { moderateBriefVisual, type VisualModerationResult } from "@/lib/ai/visual-validation.functions";
import { runBriefMatching } from "@/lib/ai/brief-matching.functions";
import { adminListTickets, adminResolveTicket, type SupportTicket } from "@/lib/support/signalement.functions";
import {
  adminListObstacleReports,
  adminValidateObstacleReport,
  adminGetObstaclePhotoUrls,
  type ObstacleReport,
} from "@/lib/tracking/obstacle.functions";

const FleetMap = lazy(() => import("@/components/owner/FleetMap"));

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Modération MoveSpot — Espace admin" },
      {
        name: "description",
        content:
          "Espace de modération MoveSpot : briefs, certifications poseurs et suivi de flotte.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDashboard,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return <div className="p-8 text-center text-destructive">{t("admin.dashboard.error_msg", { message: error.message })}</div>;
  },
});

type Tab = "briefs" | "vehicules" | "poses" | "deposes" | "poseurs" | "fleet" | "stripe" | "analytics" | "revenus" | "utilisateurs" | "vigilance" | "moderation" | "alertes";

type AnalyticsRow = { week: string; label: string; briefs: number; campaigns: number };

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("briefs");
  const [ready, setReady] = useState(false);

  // Refusal inline forms — keyed by entity ID
  const [refuseMap, setRefuseMap] = useState<Record<string, { open: boolean; notes: string }>>({});
  const openRefuse = (id: string) => setRefuseMap((p) => ({ ...p, [id]: { open: true, notes: p[id]?.notes ?? "" } }));
  const closeRefuse = (id: string) => setRefuseMap((p) => ({ ...p, [id]: { open: false, notes: "" } }));
  const setRefuseNotes = (id: string, v: string) => setRefuseMap((p) => ({ ...p, [id]: { open: true, notes: v } }));

  // Filters
  const [campaignFilter, setCampaignFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [vehicleFilter, setVehicleFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "annonceur" | "proprietaire" | "prestataire" | "partenaire">("all");

  const listBriefs = useServerFn(adminListBriefsAndCampaigns);
  const listVehicles = useServerFn(adminListVehicles);
  const reviewVehicle = useServerFn(adminReviewVehicle);
  const listInstallations = useServerFn(adminListInstallations);
  const reviewInstallation = useServerFn(adminReviewInstallation);
  const listDeposePending = useServerFn(adminListDeposePending);
  const doReviewDepose = useServerFn(adminReviewDepose);
  const doPoseTransfer = useServerFn(transferToPoseInstaller);
  const doDeposeTransfer = useServerFn(transferToDeposeInstaller);
  const listPoseurs = useServerFn(adminListPoseurs);
  const fleet = useServerFn(adminFleetLatestPositions);
  const listInactiveStripe = useServerFn(adminListInactiveStripeAccounts);
  const approveCampaign = useServerFn(adminApproveCampaign);
  const approveBrief = useServerFn(adminApproveBrief);
  const certify = useServerFn(adminCertifyPoseur);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-briefs"] });
        qc.invalidateQueries({ queryKey: ["admin-installations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "brief_proposals" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-briefs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payee_profiles" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-poseurs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, qc]);

  const briefsQuery = useQuery({
    queryKey: ["admin-briefs"],
    queryFn: () => listBriefs(),
    enabled: ready && tab === "briefs",
    retry: false,
  });
  const vehiclesQuery = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => listVehicles(),
    enabled: ready && tab === "vehicules",
    retry: false,
  });
  const poseursQuery = useQuery({
    queryKey: ["admin-poseurs"],
    queryFn: () => listPoseurs(),
    enabled: ready && tab === "poseurs",
    retry: false,
  });
  const installationsQuery = useQuery({
    queryKey: ["admin-installations"],
    queryFn: () => listInstallations(),
    enabled: ready && tab === "poses",
    retry: false,
  });
  const reviewMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; notes?: string }) =>
      reviewInstallation({
        data: { campaignRequestId: v.id, approve: v.approve, notes: v.notes },
      }),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? t("admin.dashboard.toast_pose_approved") : t("admin.dashboard.toast_pose_rejected"));
      qc.invalidateQueries({ queryKey: ["admin-installations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const depositionsQuery = useQuery({
    queryKey: ["admin-depositions"],
    queryFn: () => listDeposePending(),
    enabled: ready && tab === "deposes",
    retry: false,
  });
  const reviewDeposeMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; notes?: string }) =>
      doReviewDepose({
        data: { campaignRequestId: v.id, approve: v.approve, notes: v.notes },
      }),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? t("admin.dashboard.toast_depose_approved") : t("admin.dashboard.toast_depose_rejected"));
      qc.invalidateQueries({ queryKey: ["admin-depositions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const poseTransferMut = useMutation({
    mutationFn: (id: string) => doPoseTransfer({ data: { campaignRequestId: id } }),
    onSuccess: (res) => {
      toast.success((res as { alreadyDone?: boolean }).alreadyDone ? t("admin.dashboard.toast_already_transferred") : t("admin.dashboard.toast_pose_transferred"));
      qc.invalidateQueries({ queryKey: ["admin-installations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deposeTransferMut = useMutation({
    mutationFn: (id: string) => doDeposeTransfer({ data: { campaignRequestId: id } }),
    onSuccess: (res) => {
      toast.success((res as { alreadyDone?: boolean }).alreadyDone ? t("admin.dashboard.toast_already_transferred") : t("admin.dashboard.toast_depose_transferred"));
      qc.invalidateQueries({ queryKey: ["admin-depositions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const fleetQuery = useQuery({
    queryKey: ["admin-fleet"],
    queryFn: () => fleet(),
    enabled: ready && tab === "fleet",
    refetchInterval: 30000,
    retry: false,
  });
  const sendReminder = useServerFn(adminSendStripeReminder);
  const stripeQuery = useQuery({
    queryKey: ["admin-stripe-inactive"],
    queryFn: () => listInactiveStripe(),
    enabled: ready && tab === "stripe",
    retry: false,
  });

  const getAnalytics = useServerFn(adminAnalyticsData);
  const getRevenue = useServerFn(adminRevenueData);
  const getUsers = useServerFn(adminListUsers);

  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => getAnalytics(),
    enabled: ready && tab === "analytics",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const revenueQuery = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => getRevenue(),
    enabled: ready && tab === "revenus",
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getUsers(),
    enabled: ready && tab === "utilisateurs",
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const approveCampaignMut = useMutation({
    mutationFn: (id: string) => approveCampaign({ data: { campaignRequestId: id, approve: true } }),
    onSuccess: () => {
      toast.success(t("admin.dashboard.toast_campaign_approved"));
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const approveBriefMut = useMutation({
    mutationFn: (id: string) => approveBrief({ data: { briefId: id, approve: true } }),
    onSuccess: () => {
      toast.success(t("admin.dashboard.toast_brief_approved"));
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const certifyMut = useMutation({
    mutationFn: (id: string) => certify({ data: { payeeProfileId: id, certified: true } }),
    onSuccess: () => {
      toast.success(t("admin.dashboard.toast_garage_certified"));
      qc.invalidateQueries({ queryKey: ["admin-poseurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejectCampaignMut = useMutation({
    mutationFn: (v: { id: string; notes: string }) =>
      approveCampaign({ data: { campaignRequestId: v.id, approve: false, notes: v.notes } }),
    onSuccess: (_d, v) => {
      toast.success(t("admin.dashboard.toast_campaign_rejected"));
      closeRefuse(v.id);
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejectBriefMut = useMutation({
    mutationFn: (v: { id: string; notes: string }) =>
      approveBrief({ data: { briefId: v.id, approve: false, notes: v.notes } }),
    onSuccess: (_d, v) => {
      toast.success(t("admin.dashboard.toast_brief_rejected"));
      closeRefuse(v.id);
      qc.invalidateQueries({ queryKey: ["admin-briefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejectPoseurMut = useMutation({
    mutationFn: (v: { id: string; notes: string }) =>
      certify({ data: { payeeProfileId: v.id, certified: false, notes: v.notes } }),
    onSuccess: (_d, v) => {
      toast.success(t("admin.dashboard.toast_cert_rejected"));
      closeRefuse(v.id);
      qc.invalidateQueries({ queryKey: ["admin-poseurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewVehicleMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; notes?: string }) =>
      reviewVehicle({ data: { vehicleId: v.id, approve: v.approve, notes: v.notes } }),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? t("admin.dashboard.toast_vehicle_approved") : t("admin.dashboard.toast_vehicle_rejected"));
      qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const error =
    briefsQuery.error ??
    vehiclesQuery.error ??
    installationsQuery.error ??
    poseursQuery.error ??
    fleetQuery.error ??
    stripeQuery.error ??
    analyticsQuery.error ??
    revenueQuery.error ??
    usersQuery.error;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <LogoLink />
            <h1 className="mt-1 font-display text-2xl font-bold">{t("admin.dashboard.title")}</h1>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.dashboard.back")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <TabBtn active={tab === "briefs"} onClick={() => setTab("briefs")}>
            {t("admin.dashboard.tab_briefs")}
          </TabBtn>
          <TabBtn active={tab === "vehicules"} onClick={() => setTab("vehicules")}>
            {t("admin.dashboard.tab_vehicules")}
            {(() => {
              const pending = (vehiclesQuery.data?.vehicles ?? []).filter((v: any) => v.status === "pending").length;
              return pending > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">{pending}</span>
              ) : null;
            })()}
          </TabBtn>
          <TabBtn active={tab === "poses"} onClick={() => setTab("poses")}>
            {t("admin.dashboard.tab_poses")}
          </TabBtn>
          <TabBtn active={tab === "deposes"} onClick={() => setTab("deposes")}>
            {t("admin.dashboard.tab_deposes")}
            {(() => {
              const pending = (depositionsQuery.data?.depositions ?? []).filter((d: any) => d.depose_status === "pending_approval").length;
              return pending > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">{pending}</span>
              ) : null;
            })()}
          </TabBtn>
          <TabBtn active={tab === "poseurs"} onClick={() => setTab("poseurs")}>
            {t("admin.dashboard.tab_poseurs")}
          </TabBtn>
          <TabBtn active={tab === "fleet"} onClick={() => setTab("fleet")}>
            {t("admin.dashboard.tab_fleet")}
          </TabBtn>
          <TabBtn active={tab === "stripe"} onClick={() => setTab("stripe")}>
            {t("admin.dashboard.tab_stripe")}
            {(stripeQuery.data
              ? stripeQuery.data.incomplete.length + stripeQuery.data.neverStarted.length
              : 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                {stripeQuery.data!.incomplete.length + stripeQuery.data!.neverStarted.length}
              </span>
            )}
          </TabBtn>
          <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")}>
            {t("admin.dashboard.tab_analytics")}
          </TabBtn>
          <TabBtn active={tab === "revenus"} onClick={() => setTab("revenus")}>
            {t("admin.dashboard.tab_revenus")}
          </TabBtn>
          <TabBtn active={tab === "utilisateurs"} onClick={() => setTab("utilisateurs")}>
            {t("admin.dashboard.tab_utilisateurs")}
          </TabBtn>
          <TabBtn active={tab === "vigilance"} onClick={() => setTab("vigilance")}>
            {t("admin.dashboard.tab_vigilance")}
          </TabBtn>
          <TabBtn active={tab === "moderation"} onClick={() => setTab("moderation")}>
            {t("admin.dashboard.tab_moderation")}
          </TabBtn>
          <TabBtn active={tab === "alertes"} onClick={() => setTab("alertes")}>
            {t("admin.dashboard.tab_alertes")}
          </TabBtn>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : null}

        {tab === "vehicules" ? (
          vehiclesQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">
                  {t("admin.dashboard.vehicles_heading", { count: (vehiclesQuery.data?.vehicles ?? []).length })}
                  {" — "}
                  <span className="text-amber-600">{t("admin.dashboard.vehicles_pending", { count: (vehiclesQuery.data?.vehicles ?? []).filter((v: any) => v.status === "pending").length })}</span>
                </h2>
                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value as typeof vehicleFilter)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="all">{t("admin.dashboard.filter_all")}</option>
                  <option value="pending">{t("admin.dashboard.filter_pending")}</option>
                  <option value="approved">{t("admin.dashboard.filter_approved_m")}</option>
                  <option value="rejected">{t("admin.dashboard.filter_rejected_m")}</option>
                </select>
              </div>
              {(vehiclesQuery.data?.vehicles ?? [])
                .filter((v: any) => vehicleFilter === "all" || v.status === vehicleFilter)
                .map((v: any) => (
                <div key={v.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold">{v.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {v.type} · {v.condition} · {v.price_per_day} €/j
                        {v.km_per_day ? ` · ${v.km_per_day} km/j` : ""}
                        {v.surface_m2 ? ` · ${v.surface_m2} m²` : ""}
                      </p>
                      {v.zones?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {v.zones.map((z: string) => (
                            <span key={z} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{z}</span>
                          ))}
                        </div>
                      )}
                      {v.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{v.description}</p>
                      )}
                      {v.ai_verification && (
                        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs space-y-1">
                          <p>Photo : <span className={v.ai_verification.photo_match === "ok" ? "text-green-600" : "text-amber-600"}>{v.ai_verification.photo_match}</span>
                            {v.ai_verification.photo_notes ? ` — ${v.ai_verification.photo_notes}` : ""}
                          </p>
                          {v.ai_verification.condition_alert && (
                            <p className="text-destructive">{v.ai_verification.condition_alert}</p>
                          )}
                          {v.ai_verification.ai_generated_detected && (
                            <p className="text-destructive">⚠ IA détectée — {v.ai_verification.ai_generated_notes}</p>
                          )}
                          <p className="text-muted-foreground">
                            Prix estimé : {v.ai_verification.suggested_price_min}–{v.ai_verification.suggested_price_max} €/j
                            · {v.ai_verification.estimated_impressions_per_day?.toLocaleString("fr-FR")} imp./j
                          </p>
                        </div>
                      )}
                      {v.admin_notes && (
                        <p className="text-xs italic text-muted-foreground">{v.admin_notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {v.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => reviewVehicleMut.mutate({ id: v.id, approve: true })}
                            disabled={reviewVehicleMut.isPending}
                          >
                            {t("admin.dashboard.approve")}
                          </Button>
                          {refuseMap[v.id]?.open ? (
                            <div className="flex flex-col gap-1 items-end w-full">
                              <textarea
                                value={refuseMap[v.id]?.notes ?? ""}
                                onChange={(e) => setRefuseNotes(v.id, e.target.value)}
                                placeholder={t("admin.dashboard.reject_reason_required")}
                                rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => closeRefuse(v.id)}>{t("admin.dashboard.cancel")}</Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={reviewVehicleMut.isPending || !(refuseMap[v.id]?.notes ?? "").trim()}
                                  onClick={() => reviewVehicleMut.mutate({ id: v.id, approve: false, notes: refuseMap[v.id]?.notes })}
                                >
                                  {t("admin.dashboard.confirm_reject")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRefuse(v.id)}
                              disabled={reviewVehicleMut.isPending}
                            >
                              {t("admin.dashboard.reject")}
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          v.status === "approved" ? "bg-primary/10 text-primary" :
                          v.status === "rejected" ? "bg-destructive/10 text-destructive" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {v.status === "approved" ? t("admin.dashboard.approved") : v.status === "rejected" ? t("admin.dashboard.rejected") : v.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {v.photos?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {v.photos.slice(0, 4).map((url: string) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden rounded-lg block h-24 w-24 flex-shrink-0 border border-border">
                          <img src={url} alt={t("admin.dashboard.vehicles_col_photo")} className="h-full w-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 h-[22%] backdrop-blur-md bg-black/10 pointer-events-none" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(vehiclesQuery.data?.vehicles ?? []).filter((v: any) => vehicleFilter === "all" || v.status === vehicleFilter).length === 0 && (
                <p className="text-muted-foreground text-sm">{t("admin.dashboard.vehicles_empty_filter")}</p>
              )}
            </div>
          )
        ) : null}

        {tab === "briefs" ? (
          briefsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold">
                    {t("admin.dashboard.campaigns_heading", { count: briefsQuery.data?.campaigns.length ?? 0 })}
                  </h2>
                  <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value as typeof campaignFilter)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="all">{t("admin.dashboard.campaigns_filter_all")}</option>
                    <option value="pending">{t("admin.dashboard.campaigns_filter_pending")}</option>
                    <option value="approved">{t("admin.dashboard.campaigns_filter_approved")}</option>
                    <option value="rejected">{t("admin.dashboard.campaigns_filter_rejected")}</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {(briefsQuery.data?.campaigns ?? [])
                    .filter((c: any) => campaignFilter === "all" || c.status === campaignFilter)
                    .map((c: any) => (
                    <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{c.spot_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.company} · {c.start_date} → {c.end_date} · {c.days_count ?? "?"} j
                            {c.zone_area_km2 ? ` · ${Number(c.zone_area_km2).toFixed(1)} km²` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("admin.dashboard.campaigns_meta", { status: c.status, payment: c.payment_status, price: c.total_price ? `${c.total_price} €` : t("admin.dashboard.campaigns_price_undefined"), visuals: c.creative_files?.length ?? 0 })}
                          </p>
                          <div className="mt-2">
                            <StatusHistory
                              entityType="campaign_status"
                              entityId={c.id}
                              statusLabel={{
                                pending: t("admin.dashboard.status_pending"),
                                approved: t("admin.dashboard.status_approved"),
                                rejected: t("admin.dashboard.status_rejected"),
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {c.status === "approved" ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("admin.dashboard.campaigns_approved_badge")}</span>
                          ) : c.status === "rejected" ? (
                            <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">{t("admin.dashboard.campaigns_rejected_badge")}</span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveCampaignMut.mutate(c.id)}
                                disabled={approveCampaignMut.isPending || rejectCampaignMut.isPending}
                              >
                                {t("admin.dashboard.btn_approve")}
                              </Button>
                              {refuseMap[c.id]?.open ? (
                                <div className="flex flex-col gap-1 items-end w-56">
                                  <textarea
                                    value={refuseMap[c.id]?.notes ?? ""}
                                    onChange={(e) => setRefuseNotes(c.id, e.target.value)}
                                    placeholder={t("admin.dashboard.btn_reject_placeholder")}
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => closeRefuse(c.id)}>{t("admin.dashboard.btn_cancel")}</Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={rejectCampaignMut.isPending}
                                      onClick={() => rejectCampaignMut.mutate({ id: c.id, notes: refuseMap[c.id]?.notes ?? "" })}
                                    >
                                      {t("admin.dashboard.btn_confirm")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => openRefuse(c.id)}>
                                  {t("admin.dashboard.btn_reject")}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(briefsQuery.data?.campaigns ?? []).filter((c: any) => campaignFilter === "all" || c.status === campaignFilter).length === 0 ? (
                    <Empty>{t("admin.dashboard.campaigns_empty")}</Empty>
                  ) : null}
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-display text-lg font-bold">
                  {t("admin.dashboard.briefs_heading", { count: briefsQuery.data?.briefs.length ?? 0 })}
                </h2>
                <div className="space-y-3">
                  {(briefsQuery.data?.briefs ?? []).map((b: any) => (
                    <div key={b.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{b.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {b.start_date} → {b.end_date} · {b.days_count ?? "?"} j
                            {b.zone_area_km2 ? ` · ${Number(b.zone_area_km2).toFixed(1)} km²` : ""}
                            {b.budget_max ? ` · ${t("admin.dashboard.briefs_budget_max", { amount: b.budget_max })}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("admin.dashboard.briefs_meta", { status: b.status, visuals: b.creative_files?.length ?? 0, zones: (b.zones ?? []).join(", ") })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {b.status === "open" ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("admin.dashboard.briefs_approved_badge")}</span>
                          ) : b.status === "cancelled" ? (
                            <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">{t("admin.dashboard.briefs_rejected_badge")}</span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveBriefMut.mutate(b.id)}
                                disabled={approveBriefMut.isPending || rejectBriefMut.isPending}
                              >
                                {t("admin.dashboard.btn_approve")}
                              </Button>
                              {refuseMap[b.id]?.open ? (
                                <div className="flex flex-col gap-1 items-end w-56">
                                  <textarea
                                    value={refuseMap[b.id]?.notes ?? ""}
                                    onChange={(e) => setRefuseNotes(b.id, e.target.value)}
                                    placeholder={t("admin.dashboard.btn_reject_placeholder")}
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => closeRefuse(b.id)}>{t("admin.dashboard.btn_cancel")}</Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={rejectBriefMut.isPending}
                                      onClick={() => rejectBriefMut.mutate({ id: b.id, notes: refuseMap[b.id]?.notes ?? "" })}
                                    >
                                      {t("admin.dashboard.btn_confirm")}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => openRefuse(b.id)}>
                                  {t("admin.dashboard.btn_reject")}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(briefsQuery.data?.briefs ?? []).length === 0 ? (
                    <Empty>{t("admin.dashboard.briefs_empty")}</Empty>
                  ) : null}
                </div>
              </section>
            </div>
          )
        ) : null}

        {tab === "poses" ? (
          installationsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("admin.dashboard.poses_description")}
              </p>
              {(installationsQuery.data?.installations ?? []).map((i: any) => (
                <InstallationReviewCard
                  key={i.id}
                  item={i}
                  onReview={(approve, notes) => reviewMut.mutate({ id: i.id, approve, notes })}
                  pending={reviewMut.isPending}
                  onTransfer={() => poseTransferMut.mutate(i.id)}
                  transferring={poseTransferMut.isPending}
                />
              ))}
              {(installationsQuery.data?.installations ?? []).length === 0 ? (
                <Empty>{t("admin.dashboard.poses_empty")}</Empty>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "deposes" ? (
          depositionsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("admin.dashboard.deposes_description")}
              </p>
              {(depositionsQuery.data?.depositions ?? []).map((d: any) => (
                <DeposeReviewCard
                  key={d.id}
                  item={d}
                  onReview={(approve, notes) => reviewDeposeMut.mutate({ id: d.id, approve, notes })}
                  pending={reviewDeposeMut.isPending}
                  onTransfer={() => deposeTransferMut.mutate(d.id)}
                  transferring={deposeTransferMut.isPending}
                />
              ))}
              {(depositionsQuery.data?.depositions ?? []).length === 0 ? (
                <Empty>{t("admin.dashboard.deposes_empty")}</Empty>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "poseurs" ? (
          poseursQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-3">
              {(poseursQuery.data?.poseurs ?? []).map((p: any) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {p.full_name}{" "}
                        <span className="text-xs text-muted-foreground">({p.kind})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.city ?? "—"} · {p.siret_denomination ?? p.siret ?? "SIRET non renseigné"}
                        {p.vehicle_kind ? ` · ${p.vehicle_kind}` : ""}
                        {p.vehicle_plate ? ` · ${p.vehicle_plate}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("admin.dashboard.poseurs_meta", { cert: p.certification_status, status: p.status, payouts: p.stripe_payouts_enabled ? t("admin.dashboard.poseurs_payouts_active") : t("admin.dashboard.poseurs_payouts_inactive") })}
                      </p>
                      <div className="mt-2">
                        <StatusHistory
                          entityType="payee_certification"
                          entityId={p.id}
                          statusLabel={{
                            pending: t("admin.dashboard.status_pending"),
                            certified: t("admin.dashboard.poseurs_status_certified"),
                            rejected: t("admin.dashboard.status_rejected"),
                          }}
                        />
                      </div>
                    </div>
                    {p.certification_status === "certified" ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">🏅 {t("admin.dashboard.poseurs_certified_badge")}</span>
                    ) : p.certification_status === "rejected" ? (
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">{t("admin.dashboard.status_rejected")}</span>
                    ) : (
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          size="sm"
                          onClick={() => certifyMut.mutate(p.id)}
                          disabled={certifyMut.isPending || rejectPoseurMut.isPending}
                        >
                          {t("admin.dashboard.poseurs_btn_certify")}
                        </Button>
                        {refuseMap[p.id]?.open ? (
                          <div className="flex flex-col gap-1 items-end w-56">
                            <textarea
                              value={refuseMap[p.id]?.notes ?? ""}
                              onChange={(e) => setRefuseNotes(p.id, e.target.value)}
                              placeholder={t("admin.dashboard.btn_reject_placeholder")}
                              rows={2}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => closeRefuse(p.id)}>{t("admin.dashboard.btn_cancel")}</Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={rejectPoseurMut.isPending}
                                onClick={() => rejectPoseurMut.mutate({ id: p.id, notes: refuseMap[p.id]?.notes ?? "" })}
                              >
                                {t("admin.dashboard.btn_confirm")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openRefuse(p.id)}>
                            {t("admin.dashboard.btn_reject")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(poseursQuery.data?.poseurs ?? []).length === 0 ? (
                <Empty>{t("admin.dashboard.poseurs_empty")}</Empty>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "fleet" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.dashboard.fleet_description", { count: fleetQuery.data?.points.length ?? 0 })}
            </p>
            <ClientOnly fallback={<Skeleton />}>
              <Suspense fallback={<Skeleton />}>
                <FleetMap points={fleetQuery.data?.points ?? []} />
              </Suspense>
            </ClientOnly>
          </div>
        ) : null}

        {tab === "stripe" ? (
          stripeQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-1 font-display text-lg font-bold">
                  {t("admin.dashboard.stripe_incomplete_heading", { count: stripeQuery.data?.incomplete.length ?? 0 })}
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("admin.dashboard.stripe_incomplete_desc")}
                </p>
                <div className="space-y-3">
                  {(stripeQuery.data?.incomplete ?? []).map((p: any) => (
                    <StripeAccountRow
                      key={p.id}
                      account={p}
                      badge={t("admin.dashboard.stripe_badge_incomplete")}
                      badgeColor="amber"
                      onSendReminder={() => sendReminder({ data: { payeeProfileId: p.id } })}
                    />
                  ))}
                  {(stripeQuery.data?.incomplete ?? []).length === 0 && (
                    <Empty>{t("admin.dashboard.stripe_incomplete_empty")}</Empty>
                  )}
                </div>
              </section>

              <section>
                <h2 className="mb-1 font-display text-lg font-bold">
                  {t("admin.dashboard.stripe_never_heading", { count: stripeQuery.data?.neverStarted.length ?? 0 })}
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  {t("admin.dashboard.stripe_never_desc")}
                </p>
                <div className="space-y-3">
                  {(stripeQuery.data?.neverStarted ?? []).map((p: any) => (
                    <StripeAccountRow
                      key={p.id}
                      account={p}
                      badge={t("admin.dashboard.stripe_badge_never")}
                      badgeColor="red"
                      onSendReminder={() => sendReminder({ data: { payeeProfileId: p.id } })}
                    />
                  ))}
                  {(stripeQuery.data?.neverStarted ?? []).length === 0 && (
                    <Empty>{t("admin.dashboard.stripe_never_empty")}</Empty>
                  )}
                </div>
              </section>
            </div>
          )
        ) : null}

        {tab === "revenus" ? (
          revenueQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 font-display text-lg font-bold">{t("admin.dashboard.revenue_title")}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    label={t("admin.dashboard.revenue_total")}
                    value={revenueQuery.data?.totalRevenue ?? 0}
                    format="currency"
                  />
                  <StatCard
                    label={t("admin.dashboard.revenue_commission")}
                    value={revenueQuery.data?.commission ?? 0}
                    format="currency"
                  />
                  <StatCard
                    label={t("admin.dashboard.revenue_avg_ticket")}
                    value={revenueQuery.data?.avgTicket ?? 0}
                    format="currency"
                  />
                  <StatCard
                    label={t("admin.dashboard.revenue_conversion", { paid: revenueQuery.data?.paidCount ?? 0, total: revenueQuery.data?.totalCount ?? 0 })}
                    value={revenueQuery.data?.conversionRate ?? 0}
                    format="percent"
                  />
                </div>
              </section>

              <section>
                <h2 className="mb-1 font-display text-lg font-bold">{t("admin.dashboard.revenue_monthly_title")}</h2>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={revenueQuery.data?.monthly ?? []}
                      margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="€" />
                      <Tooltip
                        formatter={(v: number) => `${v.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR" })}`}
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="revenue" name={t("admin.dashboard.revenue_bar_gross")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="commission" name={t("admin.dashboard.revenue_bar_commission")} fill="hsl(var(--chart-2, 34 197 94))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-display text-lg font-bold">
                  {t("admin.dashboard.revenue_paid_heading", { count: revenueQuery.data?.paidCount ?? 0 })}
                </h2>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_advertiser")}</th>
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_campaign")}</th>
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_amount")}</th>
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_commission")}</th>
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_period")}</th>
                        <th className="px-4 py-3 font-medium">{t("admin.dashboard.revenue_col_created")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(revenueQuery.data?.recentPaid ?? []).map((r: any) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{r.company ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.spotName ?? "—"}</td>
                          <td className="px-4 py-3 font-semibold text-primary">
                            {r.totalPrice.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR" })}
                          </td>
                          <td className="px-4 py-3 text-green-600">
                            {r.commission.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR" })}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {r.startDate ? new Date(r.startDate).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US") : "—"}
                            {" → "}
                            {r.endDate ? new Date(r.endDate).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US") : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(revenueQuery.data?.recentPaid ?? []).length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.dashboard.revenue_paid_empty")}</div>
                  )}
                </div>
              </section>
            </div>
          )
        ) : null}

        {tab === "utilisateurs" ? (
          usersQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-lg font-bold">
                  {t("admin.dashboard.users_heading", { count: usersQuery.data?.total ?? 0 })}
                </h2>
                <div className="ml-auto flex flex-wrap gap-2">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t("admin.dashboard.users_search_placeholder")}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-48"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="all">{t("admin.dashboard.users_role_all")}</option>
                    <option value="annonceur">{t("admin.dashboard.users_role_annonceurs")}</option>
                    <option value="proprietaire">{t("admin.dashboard.users_role_proprietaires")}</option>
                    <option value="prestataire">{t("admin.dashboard.users_role_prestataires")}</option>
                    <option value="partenaire">{t("admin.dashboard.users_role_partenaires")}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {(["annonceur", "proprietaire", "prestataire", "partenaire"] as const).map((role) => {
                  const count = (usersQuery.data?.users ?? []).filter((u: AdminUserRow) => u.role === role).length;
                  const labels: Record<string, string> = {
                    annonceur: t("admin.dashboard.users_role_annonceurs"),
                    proprietaire: t("admin.dashboard.users_role_proprietaires"),
                    prestataire: t("admin.dashboard.users_role_prestataires"),
                    partenaire: t("admin.dashboard.users_role_partenaires"),
                  };
                  return (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(userRoleFilter === role ? "all" : role)}
                      className={`rounded-xl border px-4 py-2 text-sm transition ${userRoleFilter === role ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-secondary"}`}
                    >
                      {labels[role]} <span className="ml-1 font-bold">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t("admin.dashboard.users_col_name")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.dashboard.users_col_role")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.dashboard.users_col_detail")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.dashboard.users_col_status")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.dashboard.users_col_created")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usersQuery.data?.users ?? [])
                      .filter((u: AdminUserRow) => {
                        if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                        if (userSearch.trim()) {
                          const q = userSearch.toLowerCase();
                          return (u.full_name ?? "").toLowerCase().includes(q) || (u.detail ?? "").toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map((u: AdminUserRow) => {
                        const roleColors: Record<string, string> = {
                          annonceur: "bg-blue-500/10 text-blue-600",
                          proprietaire: "bg-amber-500/10 text-amber-600",
                          prestataire: "bg-purple-500/10 text-purple-600",
                          partenaire: "bg-green-500/10 text-green-600",
                        };
                        const roleLabels: Record<string, string> = {
                          annonceur: t("admin.dashboard.users_role_annonceur"),
                          proprietaire: t("admin.dashboard.users_role_proprietaire"),
                          prestataire: t("admin.dashboard.users_role_prestataire"),
                          partenaire: t("admin.dashboard.users_role_partenaire"),
                        };
                        return (
                          <tr key={`${u.role}-${u.user_id}`} className="border-b border-border last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{u.full_name ?? <span className="text-muted-foreground italic">{t("admin.dashboard.users_no_name")}</span>}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColors[u.role] ?? ""}`}>
                                {roleLabels[u.role] ?? u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{u.detail ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                u.status === "active" || u.status === "approved" || u.status === "certified"
                                  ? "bg-primary/10 text-primary"
                                  : u.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-secondary text-muted-foreground"
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {(usersQuery.data?.users ?? []).filter((u: AdminUserRow) => {
                  if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                  if (userSearch.trim()) {
                    const q = userSearch.toLowerCase();
                    return (u.full_name ?? "").toLowerCase().includes(q) || (u.detail ?? "").toLowerCase().includes(q);
                  }
                  return true;
                }).length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">{t("admin.dashboard.users_empty")}</div>
                )}
              </div>
            </div>
          )
        ) : null}

        {tab === "vigilance" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("admin.dashboard.vigilance_title")}</h2>
              <span className="text-xs text-muted-foreground">{t("admin.dashboard.vigilance_subtitle")}</span>
            </div>
            <VigilanceAdminPanel />
          </div>
        ) : null}

        {tab === "moderation" ? <AdminModerationPanel /> : null}
        {tab === "alertes" ? (
          <div className="space-y-10">
            <AdminAlertesPanel />
            <AdminObstacleReportsPanel />
          </div>
        ) : null}

        {tab === "analytics" ? (
          analyticsQuery.isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-1 font-display text-lg font-bold">{t("admin.dashboard.analytics_title")}</h2>
                <p className="mb-5 text-sm text-muted-foreground">
                  {t("admin.dashboard.analytics_subtitle")}
                </p>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={analyticsQuery.data ?? []}
                      margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="briefs" name={t("admin.dashboard.analytics_bar_briefs")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="campaigns" name={t("admin.dashboard.analytics_bar_campaigns")} fill="hsl(var(--chart-2, 34 197 94))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                <h2 className="mb-3 font-display text-lg font-bold">{t("admin.dashboard.analytics_totals_title")}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    label={t("admin.dashboard.analytics_stat_briefs")}
                    value={(analyticsQuery.data ?? []).reduce((s: number, r: AnalyticsRow) => s + r.briefs, 0)}
                  />
                  <StatCard
                    label={t("admin.dashboard.analytics_stat_campaigns")}
                    value={(analyticsQuery.data ?? []).reduce((s: number, r: AnalyticsRow) => s + r.campaigns, 0)}
                  />
                  <StatCard
                    label={t("admin.dashboard.analytics_stat_best_brief")}
                    value={Math.max(0, ...(analyticsQuery.data ?? []).map((r: AnalyticsRow) => r.briefs))}
                  />
                  <StatCard
                    label={t("admin.dashboard.analytics_stat_best_campaign")}
                    value={Math.max(0, ...(analyticsQuery.data ?? []).map((r: AnalyticsRow) => r.campaigns))}
                  />
                </div>
              </section>
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}

function StatCard({ label, value, format }: { label: string; value: number; format?: "currency" | "percent" }) {
  const { i18n } = useTranslation();
  const display = format === "currency"
    ? value.toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    : format === "percent"
    ? `${value} %`
    : value;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <p className="text-3xl font-bold font-display">{display}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Panneau modération IA ────────────────────────────────────────────────────

type BriefRow = {
  id: string;
  title: string;
  created_at: string;
  creative_files: string[] | null;
};

function AdminModerationPanel() {
  const { t, i18n } = useTranslation();
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modResults, setModResults] = useState<Record<string, VisualModerationResult>>({});
  const [modLoading, setModLoading] = useState<Record<string, boolean>>({});
  const [matchingResult, setMatchingResult] = useState<{ ownersNotified: number; matchesFound: number } | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("advertiser_briefs")
        .select("id, title, created_at, creative_files")
        .not("creative_files", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      setBriefs(
        ((data ?? []) as BriefRow[]).filter(
          (b) => Array.isArray(b.creative_files) && b.creative_files.length > 0,
        ),
      );
      setLoading(false);
    })();
  }, []);

  const analyseFile = async (briefId: string, path: string) => {
    setModLoading((p) => ({ ...p, [`${briefId}:${path}`]: true }));
    try {
      const result = await moderateBriefVisual({ data: { storagePath: path } });
      setModResults((p) => ({ ...p, [`${briefId}:${path}`]: result }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setModLoading((p) => ({ ...p, [`${briefId}:${path}`]: false }));
    }
  };

  const handleRunMatching = async () => {
    setMatchingLoading(true);
    try {
      const result = await runBriefMatching({ data: undefined });
      setMatchingResult(result);
      toast.success(t("admin.dashboard.mod_matching_success", { count: result.ownersNotified }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMatchingLoading(false);
    }
  };

  const verdictColor = (v: VisualModerationResult["verdict"]) =>
    v === "conforme" ? "text-emerald-600" : v === "suspect" ? "text-amber-600" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">{t("admin.dashboard.mod_title")}</h2>
          <p className="text-xs text-muted-foreground">{t("admin.dashboard.mod_subtitle")}</p>
        </div>

        {/* Matching proactif */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t("admin.dashboard.mod_matching_title")}</p>
            <p className="text-xs text-muted-foreground">{t("admin.dashboard.mod_matching_desc")}</p>
          </div>
          <button
            type="button"
            disabled={matchingLoading}
            onClick={handleRunMatching}
            className="shrink-0 rounded-full bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
          >
            {matchingLoading ? t("admin.dashboard.mod_matching_running") : t("admin.dashboard.mod_matching_btn")}
          </button>
          {matchingResult && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✅ {t("admin.dashboard.mod_matching_result", { notified: matchingResult.ownersNotified, matches: matchingResult.matchesFound })}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.mod_loading")}</p>
      ) : briefs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.mod_empty")}</p>
      ) : (
        <div className="space-y-4">
          {briefs.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <p className="font-semibold text-sm">{b.title}</p>
                <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}</span>
              </div>
              <div className="space-y-2">
                {(b.creative_files ?? []).map((path) => {
                  const key = `${b.id}:${path}`;
                  const result = modResults[key];
                  const isLoading = modLoading[key];
                  const filename = path.split("/").pop() ?? path;
                  return (
                    <div key={path} className={`rounded-lg border px-3 py-2 text-xs flex flex-wrap items-start gap-3 ${result ? (result.safe ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5") : "border-border bg-secondary/20"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{filename}</p>
                        {result && (
                          <div className="mt-1 space-y-0.5">
                            <p className={`font-semibold ${verdictColor(result.verdict)}`}>
                              {result.verdict.toUpperCase()} — {t("admin.dashboard.mod_risk", { score: result.score_risque })}
                            </p>
                            {result.issues.map((issue, i) => (
                              <p key={i} className="text-muted-foreground">• {issue}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {!result && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void analyseFile(b.id, path)}
                          className="shrink-0 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                        >
                          {isLoading ? t("admin.dashboard.mod_analyzing") : t("admin.dashboard.mod_analyze_btn")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panneau Alertes (signalements) ──────────────────────────────────────────

function AdminAlertesPanel() {
  const { t, i18n } = useTranslation();
  const listTickets = useServerFn(adminListTickets);
  const resolveTicket = useServerFn(adminResolveTicket);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTickets({ data: undefined });
      setTickets(data);
    } catch {
      toast.error(t("admin.dashboard.alertes_load_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleResolve = async (ticketId: string) => {
    const response = responses[ticketId]?.trim();
    if (!response) return;
    setResolving((p) => ({ ...p, [ticketId]: true }));
    try {
      await resolveTicket({ data: { ticketId, response } });
      toast.success(t("admin.dashboard.alertes_resolved_toast"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResolving((p) => ({ ...p, [ticketId]: false }));
    }
  };

  const open = tickets.filter((t) => t.status === "open");
  const resolved = tickets.filter((t) => t.status === "resolved").slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">{t("admin.dashboard.alertes_title")}</h2>
          <p className="text-xs text-muted-foreground">{t("admin.dashboard.alertes_subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          {t("admin.dashboard.alertes_refresh")}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.alertes_loading")}</p>
      ) : open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
          {t("admin.dashboard.alertes_empty")}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            🚨 {t("admin.dashboard.alertes_open_count", { count: open.length })}
          </h3>
          {open.map((t) => (
            <div key={t.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.user_email} · {new Date(t.created_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {t.context_url && (
                    <p className="text-xs text-muted-foreground">{i18n.language === "fr" ? "Contexte" : "Context"} : {t.context_url}</p>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{t.message}</p>
              <div className="flex gap-2 mt-2">
                <textarea
                  value={responses[t.id] ?? ""}
                  onChange={(e) => setResponses((p) => ({ ...p, [t.id]: e.target.value }))}
                  placeholder={t("admin.dashboard.alertes_response_placeholder")}
                  rows={2}
                  maxLength={1000}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
                <button
                  type="button"
                  disabled={!responses[t.id]?.trim() || resolving[t.id]}
                  onClick={() => void handleResolve(t.id)}
                  className="shrink-0 self-end rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {resolving[t.id] ? "…" : t("admin.dashboard.alertes_resolve_btn")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            {t("admin.dashboard.alertes_resolved_summary", { count: resolved.length })}
          </summary>
          <div className="mt-3 space-y-3">
            {resolved.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card/40 p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm">{t.subject}</p>
                  <span className="text-xs text-emerald-600 font-medium">✅ {i18n.t("admin.dashboard.alertes_resolved_badge")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.user_email} · {new Date(t.created_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}</p>
                <p className="text-sm">{t.message}</p>
                {t.admin_response && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-2 mt-1">
                    {i18n.t("admin.dashboard.alertes_admin_response_label")} : {t.admin_response}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i: any) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

type StripeAccount = {
  id: string;
  user_id: string;
  kind: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean | null;
  stripe_payouts_enabled: boolean | null;
  status: string;
  created_at: string;
};

function StripeAccountRow({
  account,
  badge,
  badgeColor,
  onSendReminder,
}: {
  account: StripeAccount;
  badge: string;
  badgeColor: "amber" | "red";
  onSendReminder: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReminder = async () => {
    setSending(true);
    try {
      await onSendReminder();
      setSent(true);
      toast.success(t("admin.dashboard.stripe_reminder_sent"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.dashboard.stripe_reminder_error"));
    } finally {
      setSending(false);
    }
  };

  const daysSince = Math.floor(
    (Date.now() - new Date(account.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {account.full_name}{" "}
            <span className="text-xs text-muted-foreground">({account.kind})</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {account.city ?? "—"} · {account.phone ?? t("admin.dashboard.stripe_no_phone")} · {t("admin.dashboard.stripe_registered_days", { days: daysSince })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.dashboard.stripe_account_meta", { id: account.stripe_account_id ?? t("admin.dashboard.stripe_no_id"), charges: account.stripe_charges_enabled ? "✅" : "⛔", payouts: account.stripe_payouts_enabled ? "✅" : "⛔" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              badgeColor === "amber"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {badge}
          </span>
          <Button variant="outline" size="sm" onClick={handleReminder} disabled={sending || sent}>
            {sent ? t("admin.dashboard.stripe_reminder_sent_btn") : sending ? t("admin.dashboard.stripe_sending") : t("admin.dashboard.stripe_send_reminder")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type InstallationItem = {
  id: string;
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  installation_photos: unknown;
  installation_status: string | null;
  installation_notes: string | null;
  pose_fee_cents: number | null;
  pose_payout_status: string | null;
  pose_stripe_transfer_id: string | null;
};

function InstallationReviewCard({
  item,
  onReview,
  pending,
  onTransfer,
  transferring,
}: {
  item: InstallationItem;
  onReview: (approve: boolean, notes?: string) => void;
  pending: boolean;
  onTransfer?: () => void;
  transferring?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState("");
  const photos = parseInstallationPhotos(item.installation_photos);
  const eur = (cents: number | null) =>
    cents != null ? (cents / 100).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR" }) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.spot_name}</p>
          <p className="text-sm text-muted-foreground">
            {item.company} · {item.start_date ?? "—"} → {item.end_date ?? "—"}
          </p>
          {item.pose_fee_cents != null && (
            <p className="text-xs text-primary font-semibold mt-0.5">
              {t("admin.dashboard.pose_fee_label")} : {eur(item.pose_fee_cents)}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold ${item.installation_status === "pending_approval" ? "text-amber-500" : item.installation_status === "approved" ? "text-emerald-500" : "text-muted-foreground"}`}>
          {item.installation_status === "pending_approval" ? `⏳ ${t("admin.dashboard.status_pending")}`
            : item.installation_status === "approved" ? `✅ ${t("admin.dashboard.pose_status_approved")}`
            : item.installation_status === "rejected" ? `⛔ ${t("admin.dashboard.pose_status_rejected")}`
            : item.installation_status ?? "pending"}
        </span>
      </div>

      {photos ? (
        <InstallationPhotoGrid photos={photos} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.pose_no_photos")}</p>
      )}

      {item.installation_notes ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("admin.dashboard.pose_note_label")} : {item.installation_notes}</p>
      ) : null}

      <div className="mt-3">
        <StatusHistory
          entityType="campaign_installation"
          entityId={item.id}
          statusLabel={{
            pending: t("admin.dashboard.pose_history_pending"),
            pending_approval: t("admin.dashboard.pose_history_pending_approval"),
            approved: t("admin.dashboard.pose_history_approved"),
            rejected: t("admin.dashboard.pose_history_rejected"),
          }}
        />
      </div>

      {item.installation_status !== "approved" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => onReview(true)} disabled={pending}>
            {t("admin.dashboard.pose_approve_btn")}
          </Button>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("admin.dashboard.pose_reject_placeholder")}
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            onClick={() => onReview(false, notes)}
            disabled={pending || !notes.trim()}
          >
            {t("admin.dashboard.btn_reject")}
          </Button>
        </div>
      ) : null}

      {item.installation_status === "approved" && onTransfer ? (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          {item.pose_payout_status === "transferred" || item.pose_stripe_transfer_id ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              ✅ {t("admin.dashboard.pose_transferred", { amount: eur(item.pose_fee_cents) })}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={onTransfer} disabled={transferring} className="text-xs h-7 px-3">
                {transferring ? t("admin.dashboard.pose_transferring") : t("admin.dashboard.pose_transfer_btn", { amount: eur(item.pose_fee_cents) })}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Dépose review card ───────────────────────────────────────────────────────

type DeposeItem = {
  id: string;
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  depose_photos: unknown;
  depose_status: string | null;
  depose_notes: string | null;
  depose_fee_cents: number | null;
  depose_payout_status: string | null;
  depose_stripe_transfer_id: string | null;
};

function DeposeReviewCard({
  item,
  onReview,
  pending,
  onTransfer,
  transferring,
}: {
  item: DeposeItem;
  onReview: (approve: boolean, notes?: string) => void;
  pending: boolean;
  onTransfer?: () => void;
  transferring?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState("");
  const photos = parseInstallationPhotos(item.depose_photos);
  const eur = (cents: number | null) =>
    cents != null ? (cents / 100).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR" }) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.spot_name}</p>
          <p className="text-sm text-muted-foreground">
            {item.company} · {item.start_date ?? "—"} → {item.end_date ?? "—"}
          </p>
          {item.depose_fee_cents != null && (
            <p className="text-xs text-primary font-semibold mt-0.5">
              {t("admin.dashboard.depose_fee_label")} : {eur(item.depose_fee_cents)}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold ${item.depose_status === "pending_approval" ? "text-amber-500" : item.depose_status === "approved" ? "text-emerald-500" : "text-muted-foreground"}`}>
          {item.depose_status === "pending_approval" ? `⏳ ${t("admin.dashboard.status_pending")}`
            : item.depose_status === "approved" ? `✅ ${t("admin.dashboard.depose_status_approved")}`
            : item.depose_status === "rejected" ? `⛔ ${t("admin.dashboard.depose_status_rejected")}`
            : item.depose_status ?? "pending"}
        </span>
      </div>

      {photos ? (
        <InstallationPhotoGrid photos={photos} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.pose_no_photos")}</p>
      )}

      {item.depose_notes ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("admin.dashboard.pose_note_label")} : {item.depose_notes}</p>
      ) : null}

      <div className="mt-3">
        <StatusHistory
          entityType="campaign_depose"
          entityId={item.id}
          statusLabel={{
            pending: t("admin.dashboard.depose_history_pending"),
            pending_approval: t("admin.dashboard.pose_history_pending_approval"),
            approved: t("admin.dashboard.depose_history_approved"),
            rejected: t("admin.dashboard.depose_history_rejected"),
          }}
        />
      </div>

      {item.depose_status !== "approved" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => onReview(true)} disabled={pending}>
            {t("admin.dashboard.depose_approve_btn")}
          </Button>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("admin.dashboard.pose_reject_placeholder")}
            className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button
            variant="outline"
            onClick={() => onReview(false, notes)}
            disabled={pending || !notes.trim()}
          >
            {t("admin.dashboard.btn_reject")}
          </Button>
        </div>
      ) : null}

      {item.depose_status === "approved" && onTransfer ? (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          {item.depose_payout_status === "transferred" || item.depose_stripe_transfer_id ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              ✅ {t("admin.dashboard.depose_transferred", { amount: eur(item.depose_fee_cents) })}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={onTransfer} disabled={transferring} className="text-xs h-7 px-3">
                {transferring ? t("admin.dashboard.pose_transferring") : t("admin.dashboard.depose_transfer_btn", { amount: eur(item.depose_fee_cents) })}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Panel signalements d'obstacles chauffeur ─────────────────────────────────


function AdminObstacleReportsPanel() {
  const { t, i18n } = useTranslation();
  const listReports   = useServerFn(adminListObstacleReports);
  const validateReport = useServerFn(adminValidateObstacleReport);
  const getPhotoUrls  = useServerFn(adminGetObstaclePhotoUrls);

  const [reports, setReports] = useState<ObstacleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    try { setReports(await listReports({ data: undefined })); }
    catch { toast.error(t("admin.dashboard.obstacle_load_error")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const handleValidate = async (id: string, validated: boolean) => {
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      await validateReport({ data: { reportId: id, validated, notes: notes[id] } });
      toast.success(validated ? t("admin.dashboard.obstacle_validated_toast") : t("admin.dashboard.obstacle_rejected_toast"));
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setProcessing((p) => ({ ...p, [id]: false })); }
  };

  const loadPhotos = async (id: string, paths: string[]) => {
    if (photos[id] || !paths.length) return;
    const res = await getPhotoUrls({ data: { reportId: id } });
    setPhotos((p) => ({ ...p, [id]: res.urls }));
  };

  const pending = reports.filter((r) => !r.admin_validated);
  const validated = reports.filter((r) => r.admin_validated).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">{t("admin.dashboard.obstacle_title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("admin.dashboard.obstacle_subtitle")}
          </p>
        </div>
        <button onClick={() => void load()} className="text-xs text-muted-foreground hover:text-foreground">{t("admin.dashboard.alertes_refresh")}</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("admin.dashboard.alertes_loading")}</p>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
          {t("admin.dashboard.obstacle_empty")}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            ⚠️ {t("admin.dashboard.obstacle_pending_count", { count: pending.length })}
          </h3>
          {pending.map((r) => (
            <div key={r.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    {t(`admin.dashboard.obstacle_type_${r.obstacle_type}`, { defaultValue: r.obstacle_type })}
                  </span>
                  <p className="text-sm font-semibold mt-0.5">{r.vehicle_name ?? r.vehicle_id ?? t("admin.dashboard.obstacle_unknown_vehicle")}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{new Date(r.reported_at).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")}</div>
                  {r.impact_start && r.impact_end && (
                    <div className="text-amber-600 dark:text-amber-400 mt-0.5">
                      {t("admin.dashboard.obstacle_impact_label")} : {new Date(r.impact_start).toLocaleTimeString(i18n.language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {new Date(r.impact_end).toLocaleTimeString(i18n.language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  {r.impact_start && !r.impact_end && (
                    <div className="text-muted-foreground mt-0.5">{t("admin.dashboard.obstacle_duration_unknown")}</div>
                  )}
                </div>
              </div>

              {r.photo_paths.length > 0 && (
                <div>
                  {!photos[r.id] ? (
                    <button
                      onClick={() => void loadPhotos(r.id, r.photo_paths)}
                      className="text-xs text-primary hover:underline"
                    >
                      📷 {t("admin.dashboard.obstacle_see_photos", { count: r.photo_paths.length })}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {photos[r.id]!.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i + 1}`} className="rounded-lg border border-border w-full aspect-video object-cover hover:opacity-90 transition" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  placeholder={t("admin.dashboard.obstacle_notes_placeholder")}
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleValidate(r.id, true)}
                    disabled={processing[r.id]}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {processing[r.id] ? "…" : t("admin.dashboard.obstacle_validate_btn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleValidate(r.id, false)}
                    disabled={processing[r.id]}
                    className="text-xs"
                  >
                    ❌ {t("admin.dashboard.obstacle_reject_btn")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {validated.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            {t("admin.dashboard.obstacle_validated_summary", { count: validated.length })}
          </summary>
          <div className="mt-2 space-y-2">
            {validated.map((r) => (
              <div key={r.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{r.vehicle_name ?? t("admin.dashboard.obstacle_vehicle_label")}</span>
                  <span className="ml-2 text-muted-foreground">{t(`admin.dashboard.obstacle_type_${r.obstacle_type}`, { defaultValue: r.obstacle_type })}</span>
                </div>
                <span>{new Date(r.reported_at).toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US")}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
