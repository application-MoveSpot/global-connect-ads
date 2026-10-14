import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCampaignMetrics } from "@/lib/tracking/tracking.functions";
import { getInvoiceData } from "@/lib/campaigns/invoice.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/advertiser/rapport/$campaignId")({
  head: () => ({ meta: [{ title: "Rapport de diffusion GPS certifié — MoveSpot" }] }),
  component: RapportPage,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return (
      <div className="p-8 text-center text-destructive">
        {t("errors.prefix")} : {error.message}
      </div>
    );
  },
});

function RapportPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const { campaignId } = Route.useParams();
  const fetchMetrics = useServerFn(getCampaignMetrics);
  const fetchInvoice = useServerFn(getInvoiceData);
  const printed = useRef(false);

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ["invoice", campaignId],
    queryFn: () => fetchInvoice({ data: { campaignId } }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["campaign-metrics", campaignId],
    queryFn: () => fetchMetrics({ data: { campaignRequestId: campaignId } }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const ready = !loadingInvoice && !loadingMetrics && !!invoice;

  useEffect(() => {
    if (ready && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [ready]);

  if (loadingInvoice || loadingMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("advertiser.rapport.loading")}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-8 text-center">
        {t("advertiser.rapport.error_not_found")}
      </div>
    );
  }

  const { campaign, profile } = invoice;
  const year = new Date(campaign.created_at).getFullYear();
  const reportNumber = `RPT-${year}-${campaignId.slice(0, 8).toUpperCase()}`;
  const generatedAt = new Date().toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

  const hasMetrics = metrics && metrics.totals.pointsTotal > 0;
  const kmTotal = hasMetrics ? (metrics.totals.distanceM / 1000).toFixed(1) : null;
  const kmZone = hasMetrics ? (metrics.totals.distanceInZoneM / 1000).toFixed(1) : null;
  const coverage =
    hasMetrics && metrics.coverageRate != null
      ? `${Math.round(metrics.coverageRate * 100)} %`
      : null;
  const daysActive = hasMetrics ? metrics.days.length : 0;
  const minutesActive = hasMetrics ? metrics.totals.activeMinutes : 0;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page { box-shadow: none !important; margin: 0 !important; padding: 24px !important; }
        }
      `}</style>

      <div className="no-print bg-muted border-b py-3 px-6 flex items-center justify-between">
        <Link
          to="/advertiser/suivi/$campaignId"
          params={{ campaignId }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("advertiser.rapport.back")}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {t("advertiser.rapport.print_btn")}
        </button>
      </div>

      <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0 print:px-0">
        <div
          className="report-page max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-10 text-sm text-gray-800"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">MoveSpot</div>
              <div className="text-xs text-gray-500 mt-0.5">{t("advertiser.rapport.tagline")}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {t("advertiser.rapport.doc_type")}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{reportNumber}</div>
              <div className="text-xs text-gray-500">
                {t("advertiser.rapport.generated", { date: generatedAt })}
              </div>
            </div>
          </div>

          {/* Campaign summary */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t("advertiser.rapport.section_campaign")}
              </div>
              <div className="font-semibold text-gray-900">{campaign.spot_name}</div>
              {campaign.spot_location && (
                <div className="text-xs text-gray-500">{campaign.spot_location}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {fmt(campaign.start_date)} → {fmt(campaign.end_date)}
              </div>
              {campaign.days_count && (
                <div className="text-xs text-gray-500">
                  {t("advertiser.rapport.days_planned", { count: campaign.days_count })}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t("advertiser.rapport.section_advertiser")}
              </div>
              <div className="font-semibold text-gray-900">{profile.full_name}</div>
              {profile.company && <div className="text-xs text-gray-600">{profile.company}</div>}
              {profile.siret && (
                <div className="text-xs text-gray-500">
                  {t("advertiser.rapport.siret_label")} {profile.siret}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6" />

          {/* Metrics */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t("advertiser.rapport.section_metrics")}
            </div>

            {!hasMetrics ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                {t("advertiser.rapport.no_gps")}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MetricBox
                    label={t("advertiser.rapport.metric_days_active")}
                    value={`${daysActive} j`}
                  />
                  <MetricBox
                    label={t("advertiser.rapport.metric_minutes")}
                    value={`${minutesActive} min`}
                  />
                  <MetricBox
                    label={t("advertiser.rapport.metric_distance_total")}
                    value={`${kmTotal} km`}
                  />
                  <MetricBox
                    label={t("advertiser.rapport.metric_distance_zone")}
                    value={`${kmZone} km`}
                  />
                </div>

                {coverage && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">
                      {t("advertiser.rapport.coverage_label")}
                    </span>
                    <span className="text-xl font-bold text-emerald-700">{coverage}</span>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  {t("advertiser.rapport.gps_points_text", {
                    inZone: metrics.totals.pointsInZone,
                    total: metrics.totals.pointsTotal,
                    days: daysActive,
                  })}
                </div>
              </>
            )}
          </div>

          {/* Route zones */}
          {campaign.route_zones && campaign.route_zones.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t("advertiser.rapport.zones_label")}
              </div>
              <div className="text-xs text-gray-600">{campaign.route_zones.join(", ")}</div>
            </div>
          )}

          {campaign.estimated_impressions_per_day && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t("advertiser.rapport.contacts_label")}
              </div>
              <div className="text-xs text-gray-600">
                {t("advertiser.rapport.contacts_text", {
                  perDay: campaign.estimated_impressions_per_day.toLocaleString(dateLocale),
                  days: daysActive > 0 ? daysActive : (campaign.days_count ?? "?"),
                  total: (
                    campaign.estimated_impressions_per_day *
                    (daysActive || campaign.days_count || 0)
                  ).toLocaleString(dateLocale),
                })}
              </div>
            </div>
          )}

          {/* Day-by-day chart */}
          {hasMetrics && metrics.days.length > 1 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t("advertiser.rapport.chart_title")}
              </div>
              <DayByDayChart
                days={metrics.days}
                dateLocale={dateLocale}
                ariaLabel={t("advertiser.rapport.chart_aria")}
              />
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />{" "}
                  {t("advertiser.rapport.chart_legend_zone")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-200" />{" "}
                  {t("advertiser.rapport.chart_legend_total")}
                </span>
              </div>
            </div>
          )}

          {/* Per-day breakdown table */}
          {hasMetrics && metrics.days.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t("advertiser.rapport.daily_title")}
              </div>
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th className="py-1.5 text-left font-medium text-gray-500">
                      {t("advertiser.rapport.col_date")}
                    </th>
                    <th className="py-1.5 text-right font-medium text-gray-500">
                      {t("advertiser.rapport.col_dist_total")}
                    </th>
                    <th className="py-1.5 text-right font-medium text-gray-500">
                      {t("advertiser.rapport.col_dist_zone")}
                    </th>
                    <th className="py-1.5 text-right font-medium text-gray-500">
                      {t("advertiser.rapport.col_coverage")}
                    </th>
                    <th className="py-1.5 text-right font-medium text-gray-500">
                      {t("advertiser.rapport.col_minutes")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.days.map(
                    (d: {
                      day: string;
                      distance_traveled_m: number;
                      distance_traveled_in_zone_m: number;
                      active_minutes: number;
                    }) => {
                      const cov =
                        d.distance_traveled_m > 0
                          ? Math.round(
                              (d.distance_traveled_in_zone_m / d.distance_traveled_m) * 100,
                            )
                          : 0;
                      return (
                        <tr key={d.day} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td className="py-1.5 text-gray-700">
                            {new Date(d.day).toLocaleDateString(dateLocale, {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {(d.distance_traveled_m / 1000).toFixed(1)} km
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {(d.distance_traveled_in_zone_m / 1000).toFixed(1)} km
                          </td>
                          <td
                            className={`py-1.5 text-right font-semibold ${cov >= 50 ? "text-emerald-700" : cov >= 20 ? "text-amber-700" : "text-gray-500"}`}
                          >
                            {cov} %
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {d.active_minutes} min
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6" />

          {/* Financial recap */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t("advertiser.rapport.section_financial")}
            </div>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="py-1.5 text-gray-600">
                    {t("advertiser.rapport.financial_amount")}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {campaign.total_price != null
                      ? `${Number(campaign.total_price).toFixed(2)} €`
                      : "—"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="py-1.5 text-gray-500">{t("advertiser.rapport.financial_vat")}</td>
                  <td className="py-1.5 text-right text-gray-500">
                    {t("advertiser.rapport.vat_exempt")}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">
                    {t("advertiser.rapport.financial_payment")}
                  </td>
                  <td className="py-1.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        campaign.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {campaign.payment_status === "paid"
                        ? t("advertiser.rapport.payment_paid")
                        : campaign.payment_status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Certification stamp */}
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-5 py-4 mb-8 flex items-start gap-4">
            <div className="shrink-0 w-14 h-14 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center text-center">
              <div className="text-[9px] font-bold text-emerald-700 leading-tight">GPS</div>
              <div className="text-[8px] font-semibold text-emerald-600 leading-tight">
                CERTIFIÉ
              </div>
              <div className="text-[7px] text-emerald-500 leading-tight mt-0.5">MoveSpot</div>
            </div>
            <div className="text-xs text-emerald-900">
              <div className="font-bold text-sm text-emerald-800 mb-1">
                {t("advertiser.rapport.cert_title")}
              </div>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("advertiser.rapport.cert_body", { ref: reportNumber }),
                }}
              />
              <div className="mt-1.5 text-emerald-700 font-medium">
                {t("advertiser.rapport.cert_stamp", { date: generatedAt, ref: reportNumber })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
            MoveSpot — RAKOUN KLUB · contact@move-spot.com
            <br />1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
          </div>
        </div>
      </div>
    </>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-base font-bold text-gray-900 font-mono">{value}</div>
    </div>
  );
}

function DayByDayChart({
  days,
  dateLocale,
  ariaLabel,
}: {
  days: Array<{ day: string; distance_traveled_m: number; distance_traveled_in_zone_m: number }>;
  dateLocale: string;
  ariaLabel: string;
}) {
  const W = 560;
  const H = 80;
  const BOTTOM = 20;
  const n = days.length;
  const maxDist = Math.max(...days.map((d) => d.distance_traveled_m ?? 0), 1);
  const barW = Math.max(4, Math.floor((W - 8) / n) - 2);
  const step = Math.floor((W - 8 - barW) / Math.max(n - 1, 1));

  return (
    <svg viewBox={`0 0 ${W} ${H + BOTTOM}`} className="w-full" role="img" aria-label={ariaLabel}>
      {days.map((d, i) => {
        const totalH = Math.round(((d.distance_traveled_m ?? 0) / maxDist) * H);
        const inZoneH = Math.round(((d.distance_traveled_in_zone_m ?? 0) / maxDist) * H);
        const x = 4 + i * step;
        const showLabel = n <= 20 || i % Math.ceil(n / 10) === 0;
        const label = new Date(d.day).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "2-digit",
        });
        return (
          <g key={d.day}>
            <rect x={x} y={H - totalH} width={barW} height={totalH} rx={1} fill="#e5e7eb" />
            <rect x={x} y={H - inZoneH} width={barW} height={inZoneH} rx={1} fill="#10b981" />
            {showLabel && (
              <text
                x={x + barW / 2}
                y={H + BOTTOM - 2}
                textAnchor="middle"
                fontSize={7}
                fill="#9ca3af"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
      {/* Baseline */}
      <line x1={0} y1={H} x2={W} y2={H} stroke="#e5e7eb" strokeWidth={1} />
    </svg>
  );
}
