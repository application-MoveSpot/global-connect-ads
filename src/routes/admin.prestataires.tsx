import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { providerServiceLabel } from "@/lib/providers/provider-services";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/admin/prestataires")({
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
  user_id: string; company: string; siret: string | null; full_name: string; email: string;
  phone: string | null; website: string | null; description: string; coverage_areas: string[];
  portfolio_urls: string[]; pricing_info: string | null; status: string; admin_notes: string | null;
  services: string[]; created_at: string;
};

type ImpossibleReport = {
  id: string; provider_id: string; status: string; vehicle_type: string | null;
  impossible_reason: string | null; impossible_photos: string[]; impossible_at: string | null;
  created_at: string;
};

function AdminProvidersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [impossibleReports, setImpossibleReports] = useState<ImpossibleReport[]>([]);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { navigate({ to: "/auth" }); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sess.session.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);
    const [{ data }, { data: reports }] = await Promise.all([
      supabase.from("provider_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("service_quotes").select("id, provider_id, status, vehicle_type, impossible_reason, impossible_photos, impossible_at, created_at")
        .eq("status", "impossible_pending").order("impossible_at", { ascending: true }),
    ]);
    setProviders((data as Provider[]) ?? []);
    setImpossibleReports((reports as ImpossibleReport[]) ?? []);
    setLoading(false);
  }, [navigate]);

  const confirmImpossible = async (id: string) => {
    await supabase.from("service_quotes").update({ status: "impossible" }).eq("id", id);
    await load();
  };

  const rejectImpossible = async (id: string) => {
    const notes = prompt(t("admin.prestataires.reject_report_reason")) ?? "";
    await supabase.from("service_quotes").update({
      status: "accepted",
      impossible_reason: null,
      impossible_photos: [],
      impossible_at: null,
    }).eq("id", id);
    await load();
  };

  useEffect(() => { load(); }, [load]);

  const setStatus = async (userId: string, status: string) => {
    const notes = status === "rejected" || status === "suspended"
      ? prompt(t(status === "rejected" ? "admin.prestataires.reject_reason" : "admin.prestataires.suspend_reason")) ?? ""
      : null;
    await supabase.from("provider_profiles").update({ status, admin_notes: notes }).eq("user_id", userId);
    await load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("admin.loading")}</div>;
  if (!authed) return <div className="min-h-screen flex items-center justify-center text-destructive">{t("admin.access_denied")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← {t("admin.back")}</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold mb-6">{t("admin.prestataires.title")}</h1>

        {impossibleReports.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold mb-3 text-orange-600 dark:text-orange-400">
              {t("admin.prestataires.impossible_title", { count: impossibleReports.length })}
            </h2>
            <div className="space-y-3">
              {impossibleReports.map((r) => (
                <div key={r.id} className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold text-sm">{t("admin.prestataires.quote", { id: r.id.slice(0, 8) })}</div>
                      {r.vehicle_type && <div className="text-xs text-muted-foreground">{t("admin.prestataires.vehicle", { type: r.vehicle_type })}</div>}
                      {r.impossible_at && (
                        <div className="text-xs text-muted-foreground">
                          {t("admin.prestataires.reported_at", { date: new Date(r.impossible_at).toLocaleString(i18n.language) })}
                        </div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      {t("admin.prestataires.in_review")}
                    </span>
                  </div>
                  {r.impossible_reason && (
                    <div className="rounded-lg bg-secondary p-3 text-sm mb-3">
                      <strong className="text-xs uppercase tracking-wide text-muted-foreground">{t("admin.prestataires.reason")}</strong>
                      <p className="mt-1 whitespace-pre-wrap">{r.impossible_reason}</p>
                    </div>
                  )}
                  {r.impossible_photos && r.impossible_photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {r.impossible_photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-border hover:opacity-80" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => confirmImpossible(r.id)}
                      className="rounded-lg bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40 px-3 py-1.5 text-sm font-semibold hover:bg-orange-500/30">
                      {t("admin.prestataires.confirm_impossible")}
                    </button>
                    <button onClick={() => rejectImpossible(r.id)}
                      className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-1.5 text-sm font-semibold hover:bg-destructive/25">
                      {t("admin.prestataires.reject_report")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {providers.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("admin.prestataires.empty")}</div>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.user_id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-semibold">{p.company}</div>
                    <div className="text-xs text-muted-foreground">{p.full_name} · {p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
                    {p.siret && <div className="text-xs text-muted-foreground">{t("admin.prestataires.siret", { siret: p.siret })}</div>}
                    {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{p.website}</a>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    p.status === "approved" ? "bg-signal/20 text-signal" :
                    p.status === "rejected" ? "bg-destructive/15 text-destructive" :
                    p.status === "suspended" ? "bg-secondary" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}>{p.status}</span>
                </div>
                {p.services && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.services.map((s) => <span key={s} className="text-[11px] bg-primary/15 text-primary font-medium px-2 py-0.5 rounded-full">{providerServiceLabel(s)}</span>)}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap mb-2">{p.description}</p>
                {p.coverage_areas.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2"><strong>{t("admin.prestataires.zones")}</strong> {p.coverage_areas.join(", ")}</div>
                )}
                {p.pricing_info && <div className="text-xs text-muted-foreground mb-2"><strong>{t("admin.prestataires.pricing")}</strong> {p.pricing_info}</div>}
                {p.portfolio_urls.length > 0 && (
                  <div className="text-xs mb-2"><strong className="text-muted-foreground">{t("admin.prestataires.portfolio")}</strong>{" "}
                    {p.portfolio_urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-2">[{i + 1}]</a>)}
                  </div>
                )}
                {p.admin_notes && <div className="rounded-lg bg-secondary p-2 text-xs mb-2"><strong>{t("admin.prestataires.note")}</strong> {p.admin_notes}</div>}
                <div className="mb-2">
                  <StatusHistory
                    entityType="provider_status"
                    entityId={p.user_id}
                    statusLabel={{ pending: t("admin.prestataires.status_pending"), approved: t("admin.prestataires.status_approved"), rejected: t("admin.prestataires.status_rejected"), suspended: t("admin.prestataires.status_suspended") }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {p.status !== "approved" && (
                    <button onClick={() => setStatus(p.user_id, "approved")} className="rounded-lg bg-signal/20 text-signal border border-signal/40 px-3 py-1.5 text-sm font-semibold hover:bg-signal/30">{t("admin.prestataires.approve")}</button>
                  )}
                  {p.status !== "rejected" && (
                    <button onClick={() => setStatus(p.user_id, "rejected")} className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 px-3 py-1.5 text-sm font-semibold hover:bg-destructive/25">{t("admin.prestataires.reject")}</button>
                  )}
                  {p.status === "approved" && (
                    <button onClick={() => setStatus(p.user_id, "suspended")} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">{t("admin.prestataires.suspend")}</button>
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
