import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  useDynamicAdjustment,
  type CalendarCampaignInput,
  ALERT_STYLES,
  PRIORITY_BADGE,
} from "@/hooks/useDynamicAdjustment";
import { useSmartScheduling, TIER_COLORS } from "@/hooks/useSmartScheduling";
import { useCampaignPredictor, RECOMMENDATION_STYLES } from "@/hooks/useCampaignPredictor";
import { useCalendarBriefGenerator } from "@/hooks/useCalendarBriefGenerator";

export const Route = createFileRoute("/advertiser/calendrier")({
  head: () => ({
    meta: [
      { title: "Calendrier des campagnes — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CalendrierPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type BriefEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  vehicle_types: string[];
  kind: "brief";
};

type CampaignEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  kind: "campaign";
};

type CalEvent = BriefEvent | CampaignEvent;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  closed: "bg-secondary text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  approved: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  active: "bg-primary/20 text-primary border-primary/30",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}

function CalendrierPage() {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language;
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorDate, setGeneratorDate] = useState<Date>(today);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      const userId = session.user.id;

      const [{ data: briefs }, { data: campaigns }] = await Promise.all([
        supabase
          .from("advertiser_briefs")
          .select("id, title, start_date, end_date, status, budget_max, vehicle_types")
          .eq("advertiser_id", userId)
          .in("status", ["open", "closed", "cancelled"]),
        supabase
          .from("campaign_requests")
          .select("id, spot_name, start_date, end_date, status")
          .eq("user_id", userId)
          .not("start_date", "is", null),
      ]);

      const briefEvents: BriefEvent[] = (briefs ?? [])
        .filter((b) => b.start_date && b.end_date)
        .map((b) => ({
          id: b.id,
          title: b.title,
          start_date: b.start_date,
          end_date: b.end_date,
          status: b.status,
          budget: b.budget_max ?? 0,
          vehicle_types: (b.vehicle_types as string[]) ?? [],
          kind: "brief" as const,
        }));

      const campaignEvents: CampaignEvent[] = (campaigns ?? [])
        .filter((c) => c.start_date && c.end_date)
        .map((c) => ({
          id: c.id,
          title: c.spot_name,
          start_date: c.start_date!,
          end_date: c.end_date!,
          status: c.status,
          kind: "campaign" as const,
        }));

      setEvents([...briefEvents, ...campaignEvents]);
      setLoading(false);
    })();
  }, [navigate]);

  // Derive budget hint from open briefs for smart scheduling
  const budgetHint = useMemo(() => {
    const openBriefs = events.filter((e): e is BriefEvent => e.kind === "brief" && e.status === "open");
    return openBriefs[0]?.budget || undefined;
  }, [events]);

  // Feed briefs to dynamic adjustment hook
  const briefCampaigns = useMemo<CalendarCampaignInput[]>(() => {
    return events
      .filter((e): e is BriefEvent => e.kind === "brief")
      .map((b) => ({
        brief_id: b.id,
        title: b.title,
        start_date: b.start_date,
        end_date: b.end_date,
        status: b.status,
        sector: "publicité mobile",
        city: "",
        budget: b.budget,
        vehicle_types: b.vehicle_types,
      }));
  }, [events]);

  const { alerts, highPriorityCount, applyAction, dismiss } = useDynamicAdjustment(briefCampaigns);

  const { getSlotData, analyze: analyzeScheduling } = useSmartScheduling({
    sector: "publicité mobile",
    budgetHint,
  });

  const { prediction, loading: predicting, predict, reset: resetPrediction } = useCampaignPredictor();

  const { brief: generatedBrief, loading: generating, generate, reset: resetBrief } =
    useCalendarBriefGenerator();

  // Re-analyze scheduling when month changes
  useEffect(() => {
    if (loading) return;
    const rangeStart = new Date(viewYear, viewMonth - 1, 1);
    const rangeEnd = new Date(viewYear, viewMonth + 2, 0);
    void analyzeScheduling(rangeStart, rangeEnd);
  }, [viewYear, viewMonth, loading, analyzeScheduling]);

  // Predict ROI when a brief is selected
  useEffect(() => {
    if (!selectedBriefId) { resetPrediction(); return; }
    const brief = events.find((e): e is BriefEvent => e.kind === "brief" && e.id === selectedBriefId);
    if (!brief) return;
    const start = new Date(brief.start_date);
    const end = new Date(brief.end_date);
    const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    void predict({
      startDate: start,
      durationDays,
      budget: brief.budget,
      sector: "publicité mobile",
      city: "France",
    });
  }, [selectedBriefId, events, predict, resetPrediction]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const monthStart = isoDate(new Date(viewYear, viewMonth, 1));
  const monthEnd = isoDate(new Date(viewYear, viewMonth + 1, 0));
  const visibleEvents = events.filter((e) => e.end_date >= monthStart && e.start_date <= monthEnd);

  const getEventsForDay = (day: number) => {
    const dayStr = isoDate(new Date(viewYear, viewMonth, day));
    return visibleEvents.filter((e) => e.start_date <= dayStr && e.end_date >= dayStr);
  };

  const todayStr = isoDate(today);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border light-band">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Calendrier des campagnes</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition"
            >
              <Sparkles className="w-4 h-4" />
              Brief IA
            </button>
            <Link
              to="/advertiser"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Retour
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Dynamic Adjustment Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {highPriorityCount > 0 && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {highPriorityCount} alerte{highPriorityCount > 1 ? "s" : ""} prioritaire{highPriorityCount > 1 ? "s" : ""}
              </p>
            )}
            {alerts.map((alert) => {
              const style = ALERT_STYLES[alert.type];
              return (
                <div key={alert.brief_id} className={cn("rounded-xl border p-4 flex items-start gap-3", style.className)}>
                  <span className="text-lg leading-none mt-0.5">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <span className={cn("text-[10px] font-semibold rounded px-1.5 py-0.5", PRIORITY_BADGE[alert.priority])}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-xs opacity-80">{alert.message}</p>
                    <button
                      onClick={() => void applyAction(alert)}
                      className="mt-2 text-xs font-semibold underline opacity-80 hover:opacity-100"
                    >
                      {alert.action.label} →
                    </button>
                  </div>
                  <button onClick={() => dismiss(alert.brief_id)} className="opacity-50 hover:opacity-100 transition mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Légende */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40 inline-block" />
            Brief actif
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/40 inline-block" />
            Campagne validée
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/40 inline-block" />
            En attente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-secondary border border-border inline-block" />
            Clôturé
          </span>
          <span className="text-muted-foreground ml-auto hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Smart Scheduling :
          </span>
          {(["optimal", "good", "average", "avoid"] as const).map((tier) => (
            <span key={tier} className="hidden sm:flex items-center gap-1">
              <span className={cn("w-2 h-6 rounded-sm border-l-2", {
                "border-green-400": tier === "optimal",
                "border-blue-400": tier === "good",
                "border-amber-400": tier === "average",
                "border-red-400": tier === "avoid",
              })} />
              <span className="text-muted-foreground">
                {tier === "optimal" ? "Optimal" : tier === "good" ? "Favorable" : tier === "average" ? "Acceptable" : "Éviter"}
              </span>
            </span>
          ))}
        </div>

        {/* Navigation mois */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-secondary transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-xl font-bold capitalize">{monthLabel}</h2>
          <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-secondary transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Grille calendrier */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayDate = new Date(viewYear, viewMonth, day);
              const dayStr = isoDate(dayDate);
              const isToday = dayStr === todayStr;
              const dayEvents = getEventsForDay(day);
              const colIndex = (startOffset + i) % 7;
              const isLastCol = colIndex === 6;
              const weekStart = getWeekStart(dayDate);
              const slotData = getSlotData(weekStart);

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[80px] border-b border-border p-1 flex flex-col gap-0.5 relative",
                    !isLastCol && "border-r",
                    isToday && "bg-primary/5",
                  )}
                >
                  {/* Smart scheduling week tier: colored left border */}
                  {slotData && (
                    <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", {
                      "bg-green-400": slotData.tier === "optimal",
                      "bg-blue-400": slotData.tier === "good",
                      "bg-amber-400": slotData.tier === "average",
                      "bg-red-400": slotData.tier === "avoid",
                    })} />
                  )}
                  <span className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}>
                    {day}
                  </span>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const colorClass =
                      ev.kind === "brief"
                        ? ev.status === "open"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-secondary text-muted-foreground"
                        : ev.status === "approved"
                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300";
                    return (
                      <div key={ev.id} title={ev.title} className={cn("text-[10px] font-medium rounded px-1 truncate leading-4", colorClass)}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste événements du mois */}
        {visibleEvents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest">Ce mois</h3>
            {visibleEvents.map((ev) => {
              const colorClass = STATUS_COLORS[ev.status] ?? STATUS_COLORS.pending;
              const isSelected = selectedBriefId === ev.id && ev.kind === "brief";
              return (
                <div key={ev.id}>
                  <div className={cn("rounded-xl border p-4 flex items-center justify-between gap-4", colorClass, isSelected && "rounded-b-none")}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                          {ev.kind === "brief" ? "Brief" : "Campagne"}
                        </span>
                        <span className="font-semibold text-sm truncate">{ev.title}</span>
                      </div>
                      <p className="text-xs opacity-70 mt-0.5">
                        {new Date(ev.start_date).toLocaleDateString(dateLocale)} →{" "}
                        {new Date(ev.end_date).toLocaleDateString(dateLocale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.kind === "brief" && (
                        <button
                          onClick={() => setSelectedBriefId(isSelected ? null : ev.id)}
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-current opacity-60 hover:opacity-100",
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {isSelected ? "Fermer" : "ROI"}
                        </button>
                      )}
                      {ev.kind === "brief" ? (
                        <Link to="/advertiser/briefs/$briefId" params={{ briefId: ev.id }} className="text-xs font-semibold underline whitespace-nowrap opacity-80 hover:opacity-100">
                          Voir →
                        </Link>
                      ) : (
                        <Link to="/advertiser/suivi/$campaignId" params={{ campaignId: ev.id }} className="text-xs font-semibold underline whitespace-nowrap opacity-80 hover:opacity-100">
                          Suivi →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Prediction panel */}
                  {isSelected && (
                    <div className="rounded-b-xl border border-t-0 border-border bg-card p-4 space-y-3">
                      {predicting ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          Analyse IA en cours…
                        </div>
                      ) : prediction ? (
                        <>
                          <div className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold border",
                            RECOMMENDATION_STYLES[prediction.recommendation].className,
                          )}>
                            {prediction.recommendation === "GO" ? "✅" : prediction.recommendation === "ADJUST" ? "⚠️" : "🚫"}
                            {RECOMMENDATION_STYLES[prediction.recommendation].label}
                          </div>
                          <p className="text-xs text-muted-foreground">{prediction.recommendation_reason}</p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { label: "Impressions", value: `${(prediction.impressions_estimate.mid / 1000).toFixed(0)}k` },
                              { label: "CPM estimé", value: `${prediction.cpm_estimate.toFixed(2)} €` },
                              { label: "Score ROI", value: `${prediction.roi_score}/100` },
                              { label: "Confiance", value: `${prediction.confidence} %` },
                            ].map(({ label, value }) => (
                              <div key={label} className="rounded-lg bg-secondary/50 p-2.5 text-center">
                                <p className="text-[10px] text-muted-foreground">{label}</p>
                                <p className="font-bold text-sm mt-0.5">{value}</p>
                              </div>
                            ))}
                          </div>

                          {prediction.key_factors.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Facteurs clés</p>
                              <ul className="space-y-0.5">
                                {prediction.key_factors.map((f) => (
                                  <li key={f} className="text-xs flex items-start gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {prediction.risk_flags.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Risques</p>
                              <ul className="space-y-0.5">
                                {prediction.risk_flags.map((f) => (
                                  <li key={f} className="text-xs flex items-start gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {events.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold mb-1">Aucune campagne planifiée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier brief pour voir vos dates ici.
            </p>
            <Link
              to="/advertiser/briefs/nouveau"
              className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
            >
              Créer un brief →
            </Link>
          </div>
        )}
      </main>

      {/* Brief Generator modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowGenerator(false); resetBrief(); }}
          />
          <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Générateur de brief IA</h2>
              </div>
              <button onClick={() => { setShowGenerator(false); resetBrief(); }} className="opacity-60 hover:opacity-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label htmlFor="generator-date" className="text-xs font-semibold text-muted-foreground block mb-1">
                Date de lancement souhaitée
              </label>
              <input
                id="generator-date"
                type="date"
                value={isoDate(generatorDate)}
                min={isoDate(today)}
                onChange={(e) => setGeneratorDate(new Date(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={() => void generate({ campaignDate: generatorDate, sector: "publicité mobile" })}
              disabled={generating}
              className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Sparkles className={cn("w-4 h-4", generating && "animate-pulse")} />
              {generating ? "Génération en cours…" : "Générer un brief"}
            </button>

            {generatedBrief && (
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="font-bold text-base">{generatedBrief.title}</h3>
                <p className="text-sm text-muted-foreground">{generatedBrief.objective}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Audience</p>
                    <p className="text-xs font-medium mt-0.5">{generatedBrief.target_audience}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Durée recommandée</p>
                    <p className="text-xs font-medium mt-0.5">{generatedBrief.recommended_duration_days} jours</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Budget estimé</p>
                    <p className="text-xs font-medium mt-0.5">
                      {generatedBrief.budget_range.min.toLocaleString()} – {generatedBrief.budget_range.max.toLocaleString()} €
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Véhicules</p>
                    <p className="text-xs font-medium mt-0.5">{generatedBrief.vehicle_types.join(", ")}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Accroches proposées
                  </p>
                  <div className="space-y-1.5">
                    {generatedBrief.taglines.map((tl, i) => (
                      <div key={i} className="rounded-lg border border-border p-2.5">
                        <p className="text-xs font-medium">"{tl.text}"</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{tl.tone}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/advertiser/briefs/nouveau"
                  onClick={() => setShowGenerator(false)}
                  className="block w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition text-center"
                >
                  Créer ce brief →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
