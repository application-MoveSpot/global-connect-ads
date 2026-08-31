import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCampaignMetrics } from "@/lib/tracking/tracking.functions";
import { getInvoiceData } from "@/lib/campaigns/invoice.functions";

export const Route = createFileRoute("/annonceur/rapport/$campaignId")({
  head: () => ({ meta: [{ title: "Rapport de campagne — MoveSpot" }] }),
  component: RapportPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

function RapportPage() {
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
        Chargement du rapport…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-8 text-center">
        Rapport introuvable ou campagne non accessible.
      </div>
    );
  }

  const { campaign, profile } = invoice;
  const year = new Date(campaign.created_at).getFullYear();
  const reportNumber = `RPT-${year}-${campaignId.slice(0, 8).toUpperCase()}`;
  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
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
        <Link to="/annonceur/suivi/$campaignId" params={{ campaignId }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au suivi
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
        >
          🖨 Imprimer / Enregistrer en PDF
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
              <div className="text-xs text-gray-500 mt-0.5">Publicité mobile sur véhicules</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">RAPPORT DE CAMPAGNE</div>
              <div className="text-xs text-gray-500 mt-0.5">{reportNumber}</div>
              <div className="text-xs text-gray-500">Généré le {generatedAt}</div>
            </div>
          </div>

          {/* Campaign summary */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Campagne</div>
              <div className="font-semibold text-gray-900">{campaign.spot_name}</div>
              {campaign.spot_location && (
                <div className="text-xs text-gray-500">{campaign.spot_location}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {fmt(campaign.start_date)} → {fmt(campaign.end_date)}
              </div>
              {campaign.days_count && (
                <div className="text-xs text-gray-500">{campaign.days_count} jour(s) prévu(s)</div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Annonceur</div>
              <div className="font-semibold text-gray-900">{profile.full_name}</div>
              {profile.company && <div className="text-xs text-gray-600">{profile.company}</div>}
              {profile.siret && <div className="text-xs text-gray-500">SIRET : {profile.siret}</div>}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6" />

          {/* Metrics */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Métriques de diffusion GPS
            </div>

            {!hasMetrics ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                Aucune donnée GPS disponible pour cette campagne.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MetricBox label="Jours de diffusion actifs" value={`${daysActive} j`} />
                  <MetricBox label="Minutes de conduite actives" value={`${minutesActive} min`} />
                  <MetricBox label="Distance totale parcourue" value={`${kmTotal} km`} />
                  <MetricBox label="Distance en zone ciblée" value={`${kmZone} km`} />
                </div>

                {coverage && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">Taux de couverture de zone</span>
                    <span className="text-xl font-bold text-emerald-700">{coverage}</span>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  {metrics.totals.pointsInZone} point(s) GPS sur {metrics.totals.pointsTotal} relevés
                  à l'intérieur de la zone de ciblage, sur {daysActive} jour(s) de diffusion enregistré(s).
                </div>
              </>
            )}
          </div>

          {/* Route zones */}
          {campaign.route_zones && campaign.route_zones.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Zones de diffusion contractuelles
              </div>
              <div className="text-xs text-gray-600">{campaign.route_zones.join(", ")}</div>
            </div>
          )}

          {campaign.estimated_impressions_per_day && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Contacts estimés
              </div>
              <div className="text-xs text-gray-600">
                ~{campaign.estimated_impressions_per_day.toLocaleString("fr-FR")} contacts/jour ×{" "}
                {daysActive > 0 ? daysActive : (campaign.days_count ?? "?")} jour(s) ={" "}
                ~{((campaign.estimated_impressions_per_day) * (daysActive || campaign.days_count || 0)).toLocaleString("fr-FR")} contacts totaux estimés
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6" />

          {/* Financial recap */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Récapitulatif financier
            </div>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="py-1.5 text-gray-600">Montant HT facturé</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {campaign.total_price != null ? `${Number(campaign.total_price).toFixed(2)} €` : "—"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td className="py-1.5 text-gray-500">TVA</td>
                  <td className="py-1.5 text-right text-gray-500">Exonéré (Art. 294 CGI)</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Statut paiement</td>
                  <td className="py-1.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        campaign.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {campaign.payment_status === "paid" ? "Payée ✓" : campaign.payment_status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Certification */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600 mb-8">
            <strong className="text-gray-800">Attestation de diffusion</strong> — Ce rapport certifie que la campagne
            publicitaire référencée ci-dessus a été diffusée par MoveSpot conformément aux conditions convenues.
            Les métriques GPS sont collectées en temps réel et agrégées automatiquement.
            Généré automatiquement le {generatedAt} · Référence {reportNumber}.
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
            MoveSpot — RAKOUN KLUB · contact@movespot.fr<br />
            1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
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
