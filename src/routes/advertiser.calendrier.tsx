import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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

function CalendrierPage() {
  const { i18n } = useTranslation();
  const dateLocale = i18n.language;
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/advertiser/inscription" }); return; }
      const userId = sess.session.user.id;

      const [{ data: briefs }, { data: campaigns }] = await Promise.all([
        supabase
          .from("advertiser_briefs")
          .select("id, title, start_date, end_date, status")
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
        .map((b) => ({ id: b.id, title: b.title, start_date: b.start_date, end_date: b.end_date, status: b.status, kind: "brief" as const }));

      const campaignEvents: CampaignEvent[] = (campaigns ?? [])
        .filter((c) => c.start_date && c.end_date)
        .map((c) => ({ id: c.id, title: c.spot_name, start_date: c.start_date!, end_date: c.end_date!, status: c.status, kind: "campaign" as const }));

      setEvents([...briefEvents, ...campaignEvents]);
      setLoading(false);
    })();
  }, [navigate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar days for current month
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = lastDay.getDate();

  // Events visible in this month
  const monthStart = isoDate(new Date(viewYear, viewMonth, 1));
  const monthEnd = isoDate(new Date(viewYear, viewMonth + 1, 0));

  const visibleEvents = events.filter(
    (e) => e.end_date >= monthStart && e.start_date <= monthEnd,
  );

  const getEventsForDay = (day: number) => {
    const dayStr = isoDate(new Date(viewYear, viewMonth, day));
    return visibleEvents.filter((e) => e.start_date <= dayStr && e.end_date >= dayStr);
  };

  const todayStr = isoDate(today);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Calendrier des campagnes</h1>
          </div>
          <Link
            to="/advertiser"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Cellules */}
          <div className="grid grid-cols-7">
            {/* Offset jours vides */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-secondary/10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = isoDate(new Date(viewYear, viewMonth, day));
              const isToday = dayStr === todayStr;
              const dayEvents = getEventsForDay(day);
              const colIndex = (startOffset + i) % 7;
              const isLastCol = colIndex === 6;

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[80px] border-b border-border p-1 flex flex-col gap-0.5",
                    !isLastCol && "border-r",
                    isToday && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {day}
                  </span>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const colorClass = ev.kind === "brief"
                      ? (ev.status === "open" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-secondary text-muted-foreground")
                      : (ev.status === "approved" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300");
                    return (
                      <div
                        key={ev.id}
                        title={ev.title}
                        className={cn("text-[10px] font-medium rounded px-1 truncate leading-4", colorClass)}
                      >
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

        {/* Liste des événements du mois */}
        {visibleEvents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-widest">Ce mois</h3>
            {visibleEvents.map((ev) => {
              const colorClass = STATUS_COLORS[ev.status] ?? STATUS_COLORS.pending;
              return (
                <div key={ev.id} className={cn("rounded-xl border p-4 flex items-center justify-between gap-4", colorClass)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {ev.kind === "brief" ? "Brief" : "Campagne"}
                      </span>
                      <span className="font-semibold text-sm truncate">{ev.title}</span>
                    </div>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(ev.start_date).toLocaleDateString(dateLocale)} → {new Date(ev.end_date).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  {ev.kind === "brief" ? (
                    <Link
                      to="/advertiser/briefs/$briefId"
                      params={{ briefId: ev.id }}
                      className="text-xs font-semibold underline whitespace-nowrap opacity-80 hover:opacity-100"
                    >
                      Voir →
                    </Link>
                  ) : (
                    <Link
                      to="/advertiser/suivi/$campaignId"
                      params={{ campaignId: ev.id }}
                      className="text-xs font-semibold underline whitespace-nowrap opacity-80 hover:opacity-100"
                    >
                      Suivi →
                    </Link>
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
            <p className="text-sm text-muted-foreground mb-4">Créez votre premier brief pour voir vos dates ici.</p>
            <Link
              to="/advertiser/briefs/nouveau"
              className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
            >
              Créer un brief →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
