import { useTranslation } from "react-i18next";

type Props = {
  zones?: string[] | null;
  waypoints?: string[] | null;
  pois?: string[] | null;
  impressionsPerDay?: number | null;
  days?: number | null;
};

export function RouteSummary({ zones, waypoints, pois, impressionsPerDay, days }: Props) {
  const { t, i18n } = useTranslation();
  const hasAny =
    (zones && zones.length > 0) ||
    (waypoints && waypoints.length > 0) ||
    (pois && pois.length > 0) ||
    (impressionsPerDay && impressionsPerDay > 0);
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs mb-4 space-y-2">
      <div className="font-semibold text-foreground">{t("route_summary.title")}</div>
      {impressionsPerDay && impressionsPerDay > 0 && (
        <div className="rounded-md bg-primary/10 text-primary px-2 py-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{impressionsPerDay.toLocaleString(i18n.language)}</span>
          <span className="opacity-80">{t("route_summary.impressions_per_day")}</span>
          {days && days > 0 && (
            <span className="opacity-80">
              {t("route_summary.impressions_total", {
                total: (impressionsPerDay * days).toLocaleString(i18n.language),
                days,
              })}
            </span>
          )}
        </div>
      )}
      {zones && zones.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">{t("route_summary.zones_label")}</div>
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z, i) => (
              <span key={i} className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                {z}
              </span>
            ))}
          </div>
        </div>
      )}
      {waypoints && waypoints.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">{t("route_summary.waypoints_label")}</div>
          <ol className="list-decimal pl-4 space-y-0.5 text-foreground">
            {waypoints.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ol>
        </div>
      )}
      {pois && pois.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1">{t("route_summary.pois_label")}</div>
          <ul className="list-disc pl-4 space-y-0.5 text-foreground">
            {pois.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
