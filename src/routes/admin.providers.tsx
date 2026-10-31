import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { RouteError } from "@/components/app/RouteError";
import { FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/providers")({
  head: () => ({
    meta: [
      { title: "Admin · Prestataires — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminProvidersPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Provider = {
  user_id: string;
  company: string;
  siret: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  description: string;
  coverage_areas: string[];
  portfolio_urls: string[];
  pricing_info: string | null;
  status: string;
  admin_notes: string | null;
  services: string[];
  created_at: string;
  kbis_url: string | null;
  rc_pro_url: string | null;
  rc_pro_expiry: string | null;
  rib_url: string | null;
  id_doc_url: string | null;
  docs_ai_status: string | null;
  docs_ai_report: Record<string, { ok: boolean; reason: string }> | null;
};

type ImpossibleReport = {
  id: string;
  provider_id: string;
  status: string;
  vehicle_type: string | null;
  impossible_reason: string | null;
  impossible_photos: string[];
  impossible_at: string | null;
  created_at: string;
};

type ImpossibleInstall = {
  id: string;
  installation_impossible_reason: string | null;
  installation_impossible_photos: string[];
  installation_impossible_at: string | null;
  pose_location_type: string | null;
  installation_address: string | null;
  created_at: string;
};

async function signDoc(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from("provider-documents")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? "#";
}

function AdminProvidersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [impossibleReports, setImpossibleReports] = useState<ImpossibleReport[]>([]);
  const [impossibleInstalls, setImpossibleInstalls] = useState<ImpossibleInstall[]>([]);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    const session = await getOrRefreshSession();
    if (!session) {
      navigate({ to: "/auth" });
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    const [{ data }, { data: reports }, { data: installs }] = await Promise.all([
      supabase.from("provider_profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("service_quotes")
        .select(
          "id, provider_id, status, vehicle_type, impossible_reason, impossible_photos, impossible_at, created_at",
        )
        .eq("status", "impossible_pending")
        .order("impossible_at", { ascending: true }),
      supabase
        .from("campaign_requests")
        .select(
          "id, installation_impossible_reason, installation_impossible_photos, installation_impossible_at, pose_location_type, installation_address, created_at",
        )
        .eq("installation_status", "impossible")
        .order("installation_impossible_at", { ascending: true }),
    ]);
    setProviders((data as Provider[]) ?? []);
    setImpossibleReports((reports as ImpossibleReport[]) ?? []);
    setImpossibleInstalls((installs as ImpossibleInstall[]) ?? []);
    setLoading(false);
  }, [navigate]);

  const confirmImpossible = async (id: string) => {
    await supabase.from("service_quotes").update({ status: "impossible" }).eq("id", id);
    await load();
  };

  const rejectImpossible = async (id: string) => {
    await supabase
      .from("service_quotes")
      .update({
        status: "accepted",
        impossible_reason: null,
        impossible_photos: [],
        impossible_at: null,
      })
      .eq("id", id);
    await load();
  };

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (userId: string, status: string) => {
    const notes =
      status === "rejected" || status === "suspended"
        ? (prompt(
            t(
              status === "rejected"
                ? "admin.providers.reject_reason"
                : "admin.providers.suspend_reason",
            ),
          ) ?? "")
        : null;
    await supabase
      .from("provider_profiles")
      .update({ status, admin_notes: notes })
      .eq("user_id", userId);
    await load();
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("admin.loading")}
      </div>
    );
  if (!authed)
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        {t("admin.access_denied")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border light-band">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.back")}
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-6">{t("admin.providers.title")}</h1>

        {impossibleInstalls.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-3 text-red-600 dark:text-red-400">
              {t("admin.providers.impossible_installs_title", { count: impossibleInstalls.length })}
            </h2>
            <div className="space-y-3">
              {impossibleInstalls.map((r) => (
                <div key={r.id} className="rounded-xl border border-red-500/40 bg-red-500/5 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {t("admin.providers.install_request", { id: r.id.slice(0, 8) })}
                      </div>
                      {r.pose_location_type && (
                        <div className="text-xs text-muted-foreground">
                          {r.pose_location_type === "garage" ? "🏪" : "🏠"}{" "}
                          {t(`prestataire.dashboard.pose_type_${r.pose_location_type}`)}
                          {r.installation_address && ` — ${r.installation_address}`}
                        </div>
                      )}
                      {r.installation_impossible_at && (
                        <div className="text-xs text-muted-foreground">
                          {t("admin.providers.reported_at", {
                            date: new Date(r.installation_impossible_at).toLocaleString(
                              i18n.language,
                            ),
                          })}
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-700 dark:text-red-300">
                      {t("admin.providers.impossible_install_badge")}
                    </span>
                  </div>
                  {r.installation_impossible_reason && (
                    <div className="rounded-lg bg-secondary p-3 text-sm mb-3">
                      <strong className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("admin.providers.reason")}
                      </strong>
                      <p className="mt-1 whitespace-pre-wrap">{r.installation_impossible_reason}</p>
                    </div>
                  )}
                  {r.installation_impossible_photos &&
                    r.installation_impossible_photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {r.installation_impossible_photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Photo ${i + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border border-border hover:opacity-80"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </section>
        )}

        {impossibleReports.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-3 text-orange-600 dark:text-orange-400">
              {t("admin.providers.impossible_title", { count: impossibleReports.length })}
            </h2>
            <div className="space-y-3">
              {impossibleReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {t("admin.providers.quote", { id: r.id.slice(0, 8) })}
                      </div>
                      {r.vehicle_type && (
                        <div className="text-xs text-muted-foreground">
                          {t("admin.providers.vehicle", { type: r.vehicle_type })}
                        </div>
                      )}
                      {r.impossible_at && (
                        <div className="text-xs text-muted-foreground">
                          {t("admin.providers.reported_at", {
                            date: new Date(r.impossible_at).toLocaleString(i18n.language),
                          })}
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {t("admin.providers.in_review")}
                    </span>
                  </div>
                  {r.impossible_reason && (
                    <div className="rounded-lg bg-secondary p-3 text-sm mb-3">
                      <strong className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("admin.providers.reason")}
                      </strong>
                      <p className="mt-1 whitespace-pre-wrap">{r.impossible_reason}</p>
                    </div>
                  )}
                  {r.impossible_photos && r.impossible_photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {r.impossible_photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border border-border hover:opacity-80"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmImpossible(r.id)}
                      className="rounded-lg bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40 px-3 py-1.5 text-sm font-semibold hover:bg-orange-500/30"
                    >
                      {t("admin.providers.confirm_impossible")}
                    </button>
                    <button
                      onClick={() => rejectImpossible(r.id)}
                      className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-1.5 text-sm font-semibold hover:bg-destructive/25"
                    >
                      {t("admin.providers.reject_report")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {providers.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("admin.providers.empty")}</div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.user_id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{p.company}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.full_name} · {p.email}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </div>
                    {p.siret && (
                      <div className="text-xs text-muted-foreground">
                        {t("admin.providers.siret", { siret: p.siret })}
                      </div>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {p.website}
                      </a>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.status === "approved"
                        ? "bg-signal/20 text-signal"
                        : p.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : p.status === "suspended"
                            ? "bg-secondary"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                {p.services && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.services.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full"
                      >
                        {providerServiceLabel(s)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap mb-2">{p.description}</p>
                {p.coverage_areas.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>{t("admin.providers.zones")}</strong> {p.coverage_areas.join(", ")}
                  </div>
                )}
                {p.pricing_info && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>{t("admin.providers.pricing")}</strong> {p.pricing_info}
                  </div>
                )}
                {p.portfolio_urls.length > 0 && (
                  <div className="text-xs mb-2">
                    <strong className="text-muted-foreground">
                      {t("admin.providers.portfolio")}
                    </strong>{" "}
                    {p.portfolio_urls.map((u, i) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline mr-2"
                      >
                        [{i + 1}]
                      </a>
                    ))}
                  </div>
                )}
                {/* Documents justificatifs */}
                {(p.kbis_url || p.rc_pro_url || p.rib_url || p.id_doc_url) && (
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t("admin.providers.docs_title")}
                      </div>
                      {p.docs_ai_status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.docs_ai_status === "verified"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : p.docs_ai_status === "rejected"
                              ? "bg-destructive/15 text-destructive"
                              : p.docs_ai_status === "verifying"
                                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                : "bg-secondary text-muted-foreground"
                        }`}>
                          {p.docs_ai_status === "verified" ? "✓ IA vérifié" :
                           p.docs_ai_status === "rejected" ? "✗ IA rejeté" :
                           p.docs_ai_status === "verifying" ? "⏳ Vérification…" :
                           "⏳ En attente IA"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.kbis_url && (
                        <DocLink path={p.kbis_url} label={t("admin.providers.doc_kbis")} aiResult={p.docs_ai_report?.kbis} />
                      )}
                      {p.rc_pro_url && (
                        <DocLink path={p.rc_pro_url} label={t("admin.providers.doc_rc_pro")} expiry={p.rc_pro_expiry} aiResult={p.docs_ai_report?.rc_pro} />
                      )}
                      {p.rib_url && (
                        <DocLink path={p.rib_url} label={t("admin.providers.doc_rib")} aiResult={p.docs_ai_report?.rib} />
                      )}
                      {p.id_doc_url && (
                        <DocLink path={p.id_doc_url} label={t("admin.providers.doc_id")} aiResult={p.docs_ai_report?.id_doc} />
                      )}
                    </div>
                  </div>
                )}
                {!p.kbis_url && !p.rc_pro_url && !p.rib_url && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 mb-2">
                    ⚠ {t("admin.providers.docs_missing")}
                  </div>
                )}
                {p.admin_notes && (
                  <div className="rounded-lg bg-secondary p-2 text-xs mb-2">
                    <strong>{t("admin.providers.note")}</strong> {p.admin_notes}
                  </div>
                )}
                <div className="mb-2">
                  <StatusHistory
                    entityType="provider_status"
                    entityId={p.user_id}
                    statusLabel={{
                      pending: t("admin.providers.status_pending"),
                      approved: t("admin.providers.status_approved"),
                      rejected: t("admin.providers.status_rejected"),
                      suspended: t("admin.providers.status_suspended"),
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {p.status !== "approved" && (() => {
                    const isProduction = import.meta.env.VITE_APP_MODE === "production";
                    const needsAi = isProduction && p.docs_ai_status !== "verified";
                    return (
                      <button
                        onClick={() => !needsAi && setStatus(p.user_id, "approved")}
                        disabled={needsAi}
                        title={needsAi ? "En mode production, l'approbation nécessite que l'IA ait vérifié les documents." : undefined}
                        className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-3 py-1.5 text-sm font-semibold hover:bg-signal/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t("admin.providers.approve")}
                      </button>
                    );
                  })()}
                  {p.status !== "rejected" && (
                    <button
                      onClick={() => setStatus(p.user_id, "rejected")}
                      className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-1.5 text-sm font-semibold hover:bg-destructive/25"
                    >
                      {t("admin.providers.reject")}
                    </button>
                  )}
                  {p.status === "approved" && (
                    <button
                      onClick={() => setStatus(p.user_id, "suspended")}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
                    >
                      {t("admin.providers.suspend")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DocLink({
  path,
  label,
  expiry,
  aiResult,
}: {
  path: string;
  label: string;
  expiry?: string | null;
  aiResult?: { ok: boolean; reason: string };
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    signDoc(path).then(setUrl);
  }, [path]);

  const expDate = expiry ? new Date(expiry) : null;
  const daysLeft = expDate ? Math.ceil((expDate.getTime() - Date.now()) / 86400000) : null;
  const expired = daysLeft !== null && daysLeft <= 0;
  const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
  const aiRejected = aiResult && !aiResult.ok;

  return (
    <div className="flex flex-col gap-0.5">
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        title={aiResult?.reason}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-secondary ${
          aiRejected
            ? "border-destructive/40 text-destructive bg-destructive/5"
            : expired
              ? "border-destructive/40 text-destructive bg-destructive/5"
              : expiringSoon
                ? "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5"
                : aiResult?.ok
                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5"
                  : "border-border text-foreground"
        }`}
      >
        {aiRejected || expired || expiringSoon ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        {label}
        {expiry && (
          <span className="text-[10px] text-muted-foreground">
            {expired ? "(expirée)" : expiringSoon ? `(J-${daysLeft})` : `(${new Date(expiry).toLocaleDateString("fr-FR")})`}
          </span>
        )}
        {aiResult && (
          <span className="text-[10px]">{aiResult.ok ? "✓" : "✗"}</span>
        )}
      </a>
      {aiResult && (
        <span className={`text-[10px] px-1 ${aiResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {aiResult.reason}
        </span>
      )}
    </div>
  );
}
