import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteSummary } from "@/components/shared/RouteSummary";
import { CreativeFiles } from "@/components/shared/CreativeFiles";
import { Link } from "@tanstack/react-router";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Request = {
  id: string;
  spot_name: string;
  spot_location: string | null;
  spot_price: number | null;
  company: string;
  email: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  route_zones: string[] | null;
  route_waypoints: string[] | null;
  route_pois: string[] | null;
  estimated_impressions_per_day: number | null;
  days_count: number | null;
  creative_files: string[] | null;
  total_price: number | null;
  payment_status: string | null;
  payout_status: string | null;
  end_date: string | null;
  owner_amount_cents: number | null;
  platform_fee_cents: number | null;
};

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format_publicitaire: string;
  price_per_day: number;
  status: string;
  admin_notes: string | null;
  photos: string[] | null;
  owner_id: string;
  zones: string[] | null;
  km_per_day: number | null;
  surface_m2: number | null;
  description: string | null;
  condition: string | null;
  ai_verification: {
    photo_match?: string;
    photo_notes?: string;
    condition_alert?: string | null;
    suggested_price_min?: number;
    suggested_price_max?: number;
    estimated_impressions_per_day?: number;
    checked_at?: string;
  } | null;
  created_at: string;
};

type AuthState = "checking" | "unauthenticated" | "unauthorized" | "ok";

const REQUEST_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`${label} a expiré`)), REQUEST_TIMEOUT_MS)),
  ]);
}

function AdminPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<"requests" | "vehicles">("requests");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = useCallback(async (statusFilter: typeof filter) => {
    setDataLoading(true);
    setDataError("");
    const reqQ = supabase.from("campaign_requests").select("*").order("created_at", { ascending: false }).limit(100);
    const vehQ = supabase.from("vehicles").select("*").order("created_at", { ascending: false }).limit(100);
    if (statusFilter !== "all") {
      reqQ.eq("status", statusFilter);
      vehQ.eq("status", statusFilter);
    }
    try {
      const [{ data: reqs, error: reqError }, { data: vehs, error: vehError }] = await withTimeout(Promise.all([reqQ, vehQ]), "Le chargement des données");
      if (reqError || vehError) throw reqError ?? vehError;
      setRequests((reqs as Request[]) ?? []);
      setVehicles((vehs as Vehicle[]) ?? []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : t("admin.dashboard.load_error"));
      setRequests([]);
      setVehicles([]);
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess, error: sessionError } = await withTimeout(supabase.auth.getSession(), "La vérification de session");
        if (cancelled) return;
        if (sessionError || !sess.session) {
          setAuthState("unauthenticated");
          navigate({ to: "/auth" });
          return;
        }
        const { data: isAdmin, error: roleError } = await withTimeout(
          supabase.rpc("check_is_admin" as never),
          "La vérification du rôle admin"
        );
        if (cancelled) return;
        if (roleError || !isAdmin) { setAuthState("unauthorized"); return; }
        setAuthState("ok");
      } catch {
        if (!cancelled) setAuthState("unauthenticated");
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (authState === "ok") load(filter);
  }, [filter, authState, load]);

  const updateRequest = async (id: string, status: "approved" | "rejected") => {
    await supabase.from("campaign_requests").update({ status }).eq("id", id);
    load(filter);
  };

  const updateVehicle = async (id: string, status: "approved" | "rejected", note?: string) => {
    await supabase.from("vehicles").update({ status, admin_notes: note ?? null }).eq("id", id);
    load(filter);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (location.pathname !== "/admin") return <Outlet />;

  if (authState === "checking") return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("admin.dashboard.checking")}</div>;

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">{t("admin.dashboard.session_not_found")}</h1>
          <p className="text-muted-foreground mb-4">{t("admin.dashboard.reconnect_desc")}</p>
          <button onClick={() => navigate({ to: "/auth" })} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">{t("admin.dashboard.sign_in")}</button>
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">{t("admin.dashboard.access_denied")}</h1>
          <p className="text-muted-foreground mb-4">{t("admin.dashboard.not_admin")}</p>
          <button onClick={logout} className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium">{t("admin.dashboard.sign_out")}</button>
        </div>
      </div>
    );
  }

  const loc = i18n.language;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("admin.dashboard.title")}</h1>
          </div>
          <button onClick={logout} className="text-sm text-muted-foreground hover:text-foreground">{t("admin.dashboard.logout")}</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            <TabBtn active={tab === "requests"} onClick={() => setTab("requests")}>{t("admin.dashboard.tab_requests")}{dataLoading ? "" : ` (${requests.length})`}</TabBtn>
            <TabBtn active={tab === "vehicles"} onClick={() => setTab("vehicles")}>{t("admin.dashboard.tab_vehicles")}{dataLoading ? "" : ` (${vehicles.length})`}</TabBtn>
            <Link to="/admin/providers" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_providers")}</Link>
            <Link to="/admin/virements" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_transfers")}</Link>
            <Link to="/admin/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_moderation")}</Link>
            <Link to="/admin/commissions" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_commissions")}</Link>
            <Link to="/admin/audit" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_audit")}</Link>
            <Link to="/admin/remboursements" className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-secondary">{t("admin.dashboard.nav_refunds")}</Link>
          </div>
          <div className="flex gap-2">
            <a
              href="/previsionnel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              {t("admin.dashboard.nav_previsionnel")}
            </a>
            <Link
              to="/kit"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
            >
              {t("admin.dashboard.nav_kit")}
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}>
              {t(`admin.dashboard.filter_${f}`)}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded mb-3" />
                <div className="h-3 w-1/2 bg-muted rounded mb-2" />
                <div className="h-20 w-full bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        ) : dataError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
            <h2 className="font-display text-xl font-bold mb-2">{t("admin.dashboard.load_error_title")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{dataError}</p>
            <button onClick={() => load(filter)} className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">{t("admin.dashboard.retry")}</button>
          </div>
        ) : tab === "requests" ? (
          requests.length === 0 ? (
            <Empty msg={t("admin.dashboard.empty_requests")} />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{r.spot_name} · {r.spot_location}</div>
                      <h3 className="font-display text-xl font-bold mt-1">{r.company}</h3>
                      <a href={`mailto:${r.email}`} className="text-sm text-primary">{r.email}</a>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={r.status} />
                      <div className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString(loc)}</div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-4 text-sm mb-4 whitespace-pre-wrap">{r.message}</div>
                  <RouteSummary zones={r.route_zones} waypoints={r.route_waypoints} pois={r.route_pois} impressionsPerDay={r.estimated_impressions_per_day} days={r.days_count} />
                  <CreativeFiles paths={r.creative_files} />
                  {r.admin_notes && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs mb-4">
                      <strong>{t("admin.dashboard.auto_reason")}</strong> {r.admin_notes}
                    </div>
                  )}
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => updateRequest(r.id, "approved")}
                        className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-4 py-2 text-sm font-semibold hover:bg-signal/30">
                        {t("admin.dashboard.validate")}
                      </button>
                      <button onClick={() => updateRequest(r.id, "rejected")}
                        className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-4 py-2 text-sm font-semibold hover:bg-destructive/25">
                        {t("admin.dashboard.refuse")}
                      </button>
                    </div>
                  )}
                  {r.status === "approved" && r.payment_status === "paid" && (
                    <PayoutBlock req={r} onDone={() => load(filter)} />
                  )}
                </div>
              ))}
            </div>
          )
        ) : vehicles.length === 0 ? (
          <Empty msg={t("admin.dashboard.empty_vehicles")} />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} v={v} onUpdate={updateVehicle} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function VehicleCard({ v, onUpdate }: { v: Vehicle; onUpdate: (id: string, status: "approved" | "rejected", note?: string) => Promise<void> }) {
  const { t, i18n } = useTranslation();
  const [note, setNote] = useState(v.admin_notes ?? "");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photoUrls = useVehiclePhotoUrls(v.photos);
  const photos = photoUrls;
  const ai = v.ai_verification;
  const matchColor = ai?.photo_match === "ok" ? "bg-signal/20 text-signal"
    : ai?.photo_match === "doubtful" ? "bg-yellow-500/15 text-yellow-600"
    : ai?.photo_match === "mismatch" ? "bg-destructive/20 text-destructive"
    : "bg-muted text-muted-foreground";

  const loc = i18n.language;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {photos.length > 0 ? (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <button type="button" key={url + i} onClick={() => setLightbox(url)}
                className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition">
                <img src={url} alt={`${v.name} ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">{t("admin.dashboard.photo_hint", { count: photos.length })}</div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 mb-4 text-center text-xs text-muted-foreground">{t("admin.dashboard.no_photo")}</div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-bold">{v.name}</h3>
        <StatusBadge status={v.status} />
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {v.type}{v.format_publicitaire ? ` · ${v.format_publicitaire}` : ""}
        {v.condition && <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary">{t("admin.dashboard.condition", { value: v.condition })}</span>}
      </div>
      {v.description && <p className="text-sm mb-3">{v.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        <span><strong className="text-foreground">{v.price_per_day}€/jour</strong></span>
        {v.surface_m2 != null && <span>{v.surface_m2} m²</span>}
        {v.km_per_day != null && <span>{v.km_per_day} km/j</span>}
      </div>
      {v.zones && v.zones.length > 0 && <div className="text-xs text-muted-foreground mb-3">{t("admin.dashboard.zones", { value: v.zones.join(", ") })}</div>}

      {ai && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("admin.dashboard.ai_check")}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${matchColor}`}>
              {ai.photo_match === "ok" ? t("admin.dashboard.ai_ok") : ai.photo_match === "doubtful" ? t("admin.dashboard.ai_doubtful") : ai.photo_match === "mismatch" ? t("admin.dashboard.ai_mismatch") : t("admin.dashboard.ai_unverified")}
            </span>
          </div>
          {ai.photo_notes && <p className="text-xs">{ai.photo_notes}</p>}
          {ai.condition_alert && <p className="text-xs text-destructive">⚠ {ai.condition_alert}</p>}
          {(ai.suggested_price_min != null || ai.estimated_impressions_per_day != null) && (
            <div className="text-xs text-muted-foreground">
              {ai.suggested_price_min != null && <>{t("admin.dashboard.suggested_price")} <strong className="text-foreground">{ai.suggested_price_min}–{ai.suggested_price_max} €/j</strong></>}
              {ai.estimated_impressions_per_day != null && <> · {t("admin.dashboard.impressions", { n: ai.estimated_impressions_per_day.toLocaleString(loc) })}</>}
            </div>
          )}
        </div>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.dashboard.note_placeholder")} rows={2}
        className="w-full text-xs rounded-lg bg-input border border-border px-3 py-2 mb-3" />
      <div className="flex gap-2">
        <button onClick={() => onUpdate(v.id, "approved", note)}
          className="flex-1 rounded-lg bg-signal/20 text-signal border border-signal/40 px-3 py-2 text-sm font-semibold hover:bg-signal/30">
          {t("admin.dashboard.approve")}
        </button>
        <button onClick={() => onUpdate(v.id, "rejected", note)}
          className="flex-1 rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-2 text-sm font-semibold hover:bg-destructive/25">
          {t("admin.dashboard.refuse")}
        </button>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={lightbox} alt={t("admin.dashboard.lightbox_alt")} className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white w-10 h-10 flex items-center justify-center text-xl">✕</button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}>{children}</button>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">{msg}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    approved: "bg-signal/20 text-signal",
    rejected: "bg-destructive/15 text-destructive",
    paused: "bg-muted text-muted-foreground",
  };
  const labelKeys: Record<string, string> = {
    pending: "admin.dashboard.status_pending",
    approved: "admin.dashboard.status_approved",
    rejected: "admin.dashboard.status_rejected",
    paused: "admin.dashboard.status_paused",
  };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? ""}`}>{labelKeys[status] ? t(labelKeys[status]) : status}</span>;
}

function PayoutBlock({ req, onDone }: { req: Request; onDone: () => void }) {
  const { t } = useTranslation();
  const endDate = req.end_date ? new Date(req.end_date) : null;
  const campaignEnded = endDate ? endDate <= new Date() : false;
  const alreadyDone = req.payout_status === "transferred";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doTransfer = async () => {
    setLoading(true); setError(null);
    try {
      const { transferToOwner } = await import("@/lib/payments/payments.functions");
      await transferToOwner({ data: { campaignRequestId: req.id } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
      <div className="flex flex-wrap gap-3">
        <span>{t("admin.dashboard.payout_paid", { amount: Number(req.total_price ?? 0).toFixed(2) })}</span>
        <span>{t("admin.dashboard.payout_commission", { amount: ((req.platform_fee_cents ?? 0) / 100).toFixed(2) })}</span>
        <span>{t("admin.dashboard.payout_to_transfer", { amount: ((req.owner_amount_cents ?? 0) / 100).toFixed(2) })}</span>
      </div>
      {alreadyDone ? (
        <div className="text-emerald-700">{t("admin.dashboard.payout_done")}</div>
      ) : campaignEnded ? (
        <div className="flex items-center gap-2">
          <button
            onClick={doTransfer}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs disabled:opacity-50"
          >
            {loading ? t("admin.dashboard.payout_transferring") : t("admin.dashboard.payout_transfer_btn")}
          </button>
          {error && <span className="text-destructive">{error}</span>}
        </div>
      ) : (
        <div className="text-muted-foreground">{t("admin.dashboard.payout_waiting")}</div>
      )}
    </div>
  );
}
