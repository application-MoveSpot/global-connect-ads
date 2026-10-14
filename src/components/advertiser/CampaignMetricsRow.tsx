import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getCampaignMetrics } from "@/lib/tracking/tracking.functions";

interface Props {
  campaignId: string;
  status: string;
  paymentStatus: string;
}

export function CampaignMetricsRow({ campaignId, status, paymentStatus }: Props) {
  const { t } = useTranslation();
  const fetchMetrics = useServerFn(getCampaignMetrics);
  const active = status === "approved" && paymentStatus === "paid";

  const { data: metrics } = useQuery({
    queryKey: ["campaign-metrics", campaignId],
    queryFn: () => fetchMetrics({ data: { campaignRequestId: campaignId } }),
    enabled: active,
    staleTime: 5 * 60_000,
    refetchInterval: active ? 5 * 60_000 : false,
  });

  if (!active) return null;

  const hasData = metrics && metrics.totals.pointsTotal > 0;
  const kmTotal = hasData ? (metrics.totals.distanceM / 1000).toFixed(1) : null;
  const kmZone = hasData ? (metrics.totals.distanceInZoneM / 1000).toFixed(1) : null;
  const coverage =
    hasData && metrics.coverageRate != null ? `${Math.round(metrics.coverageRate * 100)} %` : null;
  const minutes = hasData ? metrics.totals.activeMinutes : null;
  const coverageHigh = hasData && metrics.coverageRate != null && metrics.coverageRate > 0.5;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {t("metrics.broadcasting")}
        </span>
        <Link
          to="/advertiser/suivi/$campaignId"
          params={{ campaignId }}
          className="text-xs text-primary hover:underline font-medium"
        >
          {t("metrics.gps_full")} →
        </Link>
      </div>

      {!hasData ? (
        <p className="text-xs text-muted-foreground italic">{t("metrics.waiting_gps")}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MetricTile value={kmTotal!} unit="km" label={t("metrics.label_km")} />
            <MetricTile value={String(minutes!)} unit="min" label={t("metrics.label_min")} />
            <MetricTile
              value={coverage ?? "—"}
              label={t("metrics.label_coverage")}
              highlight={coverageHigh}
            />
          </div>
          {kmZone !== null && kmZone !== kmTotal && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("metrics.zone_km", { km: kmZone })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function MetricTile({
  value,
  unit,
  label,
  highlight = false,
}: {
  value: string;
  unit?: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md bg-background/60 border border-border/50 px-2 py-2.5">
      <p
        className={`text-xl font-bold font-mono leading-none ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
      >
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}
