import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { downloadCsv } from "@/lib/exportCsv";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/proprietaire/historique")({
  head: () => ({
    meta: [
      { title: "Historique des reversements — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HistoriquePage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Reversement = {
  id: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  spot_name: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  days_count: number | null;
  total_price: number | null;
  status: string;
  owner_response: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  approved:  "text-emerald-600 bg-emerald-500/10",
  paid:      "text-emerald-600 bg-emerald-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  pending:   "text-amber-600 bg-amber-500/10",
  rejected:  "text-red-600 bg-red-500/10",
};

const COMPLETED_STATUSES = new Set(["approved", "paid", "completed"]);

function HistoriquePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const currencyLocale = dateLocale;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reversements, setReversements] = useState<Reversement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/proprietaire/inscription" });
        return;
      }
      const { data: prof } = await supabase
        .from("owner_profiles")
        .select("id")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (!prof) {
        navigate({ to: "/proprietaire/inscription" });
        return;
      }

      const { data: vehicles, error: vErr } = await supabase
        .from("vehicles")
        .select("id, name")
        .eq("owner_id", prof.id);
      if (vErr) {
        setError(vErr.message);
        setLoading(false);
        return;
      }

      if (!vehicles || vehicles.length === 0) {
        setReversements([]);
        setLoading(false);
        return;
      }

      const vehicleIds = vehicles.map((v) => v.id);
      const vehicleMap: Record<string, string> = {};
      for (const v of vehicles) vehicleMap[v.id] = v.name;

      const { data: requests, error: rErr } = await supabase
        .from("campaign_requests")
        .select("id, vehicle_id, spot_name, company, start_date, end_date, days_count, total_price, status, owner_response, created_at")
        .in("vehicle_id", vehicleIds)
        .or("owner_response.eq.accepted,status.in.(approved,paid,completed)")
        .order("created_at", { ascending: false });

      if (rErr) {
        setError(rErr.message);
        setLoading(false);
        return;
      }

      setReversements(
        (requests ?? []).map((r) => ({
          ...r,
          vehicle_name: r.vehicle_id ? (vehicleMap[r.vehicle_id] ?? null) : null,
        }))
      );
      setLoading(false);
    })();
  }, [navigate]);

  const totalEarnings = reversements.reduce((sum, r) => sum + (r.total_price ?? 0), 0);
  const completedEarnings = reversements
    .filter((r) => COMPLETED_STATUSES.has(r.status))
    .reduce((sum, r) => sum + (r.total_price ?? 0), 0);

  const exportCsv = () => {
    const rows = reversements.map((r) => ({
      id: r.id,
      vehicule: r.vehicle_name ?? "",
      annonceur: r.company,
      spot: r.spot_name,
      debut: r.start_date ?? "",
      fin: r.end_date ?? "",
      jours: r.days_count ?? "",
      montant_eur: r.total_price ?? "",
      statut: t(`proprietaire.historique.status_${r.status}`, r.status),
      date_reception: r.created_at,
    }));
    downloadCsv(rows, `movespot-reversements-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("proprietaire.historique.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("proprietaire.historique.title")}</h1>
          </div>
          <Link
            to="/proprietaire"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {t("proprietaire.historique.back")}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("proprietaire.historique.kpi_campaigns")}</p>
            <p className="font-display text-3xl font-bold">{reversements.length}</p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("proprietaire.historique.kpi_total")}</p>
            <p className="font-display text-3xl font-bold text-primary">
              {totalEarnings.toLocaleString(currencyLocale, { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("proprietaire.historique.kpi_completed")}</p>
            </div>
            <p className="font-display text-3xl font-bold text-emerald-600">
              {completedEarnings.toLocaleString(currencyLocale, { style: "currency", currency: "EUR" })}
            </p>
          </div>
        </div>

        {reversements.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground text-sm">{t("proprietaire.historique.empty")}</p>
            <p className="text-muted-foreground text-xs mt-1">{t("proprietaire.historique.empty_hint")}</p>
            <Link to="/proprietaire" className="mt-4 inline-block text-sm text-primary underline">
              {t("proprietaire.historique.empty_link")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary transition"
              >
                {t("proprietaire.historique.export_csv")}
              </button>
            </div>

            <div className="space-y-3">
              {reversements.map((r) => {
                const statusLabel = t(`proprietaire.historique.status_${r.status}`, r.status);
                const statusColor = STATUS_COLORS[r.status] ?? "text-muted-foreground bg-muted";
                return (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">
                            {r.spot_name}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <h3 className="font-semibold mt-0.5">{r.company}</h3>
                        {r.vehicle_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">🚗 {r.vehicle_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {r.total_price != null && (
                          <p className="font-display text-xl font-bold text-primary">
                            {r.total_price.toLocaleString(currencyLocale, { style: "currency", currency: "EUR" })}
                          </p>
                        )}
                        {r.days_count != null && (
                          <p className="text-xs text-muted-foreground">{t("proprietaire.historique.days", { count: r.days_count })}</p>
                        )}
                      </div>
                    </div>
                    {(r.start_date || r.end_date) && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {r.start_date && (
                          <span>
                            {t("proprietaire.historique.date_start")} <strong className="text-foreground">{new Date(r.start_date).toLocaleDateString(dateLocale)}</strong>
                          </span>
                        )}
                        {r.end_date && (
                          <span>
                            {t("proprietaire.historique.date_end")} <strong className="text-foreground">{new Date(r.end_date).toLocaleDateString(dateLocale)}</strong>
                          </span>
                        )}
                        <span className="ml-auto">
                          {t("proprietaire.historique.received_at", { date: new Date(r.created_at).toLocaleDateString(dateLocale) })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
