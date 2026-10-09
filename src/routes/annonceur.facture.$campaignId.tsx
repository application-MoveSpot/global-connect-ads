import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getInvoiceData } from "@/lib/campaigns/invoice.functions";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/annonceur/facture/$campaignId")({
  head: () => ({ meta: [{ title: "Facture — MoveSpot" }] }),
  component: FacturePage,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return <div className="p-8 text-center text-destructive">{t("errors.prefix")} : {error.message}</div>;
  },
});

function FacturePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const { campaignId } = Route.useParams();
  const fetchInvoice = useServerFn(getInvoiceData);
  const printed = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", campaignId],
    queryFn: () => fetchInvoice({ data: { campaignId } }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  // Auto-print when data arrives (once)
  useEffect(() => {
    if (data && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("annonceur.facture.loading")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-8 text-center">
        {error instanceof Error ? error.message : t("annonceur.facture.error_not_found")}
      </div>
    );
  }

  const { campaign, profile, email } = data;
  const year = new Date(campaign.created_at).getFullYear();
  const invoiceNumber = `MS-${year}-${campaignId.slice(0, 8).toUpperCase()}`;
  const isPaid = campaign.payment_status === "paid";
  const totalHT = campaign.total_price ?? 0;

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; padding: 24px !important; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print bg-muted border-b py-3 px-6 flex items-center justify-between">
        <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">
          {t("annonceur.facture.back")}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {t("annonceur.facture.print_btn")}
        </button>
      </div>

      {/* Invoice */}
      <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0 print:px-0">
        <div
          className="invoice-page max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-10 text-sm text-gray-800"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="text-2xl font-bold text-gray-900 tracking-tight">MoveSpot</div>
              <div className="text-xs text-gray-500 mt-0.5">{t("annonceur.facture.tagline")}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{t("annonceur.facture.doc_type")}</div>
              <div className="text-xs text-gray-500 mt-0.5">{invoiceNumber}</div>
              <div className="text-xs text-gray-500">
                {t("annonceur.facture.date_label", { date: fmt(campaign.created_at) })}
              </div>
            </div>
          </div>

          {/* Paid badge */}
          {isPaid && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-300 px-4 py-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wide">
              {t("annonceur.facture.paid_badge")}
            </div>
          )}

          {/* From / To */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("annonceur.facture.from_label")}</div>
              <div className="font-semibold text-gray-900">RAKOUN KLUB</div>
              <div className="text-gray-600 text-xs leading-relaxed mt-0.5">
                1 Lot, Immeuble Sud Jarry<br />
                ZAC de Houelbourg<br />
                97122 Baie-Mahault, Guadeloupe<br />
                contact@movespot.fr
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("annonceur.facture.to_label")}</div>
              <div className="font-semibold text-gray-900">{profile.full_name}</div>
              {profile.company && (
                <div className="text-gray-700 text-xs">{profile.company}</div>
              )}
              {profile.siret && (
                <div className="text-gray-500 text-xs">{t("annonceur.facture.siret_label")} {profile.siret}</div>
              )}
              {profile.address && (
                <div className="text-gray-600 text-xs leading-relaxed mt-0.5 whitespace-pre-line">{profile.address}</div>
              )}
              <div className="text-gray-500 text-xs mt-0.5">{email}</div>
              {profile.phone && (
                <div className="text-gray-500 text-xs">{profile.phone}</div>
              )}
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-6" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("annonceur.facture.col_description")}</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("annonceur.facture.col_qty")}</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("annonceur.facture.col_unit")}</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("annonceur.facture.col_total")}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td className="py-3 pr-4">
                  <div className="font-medium text-gray-900">{campaign.spot_name}</div>
                  {campaign.spot_location && (
                    <div className="text-xs text-gray-500">{campaign.spot_location}</div>
                  )}
                  {(campaign.start_date || campaign.end_date) && (
                    <div className="text-xs text-gray-500">
                      {t("annonceur.facture.period", { from: fmt(campaign.start_date), to: fmt(campaign.end_date) })}
                    </div>
                  )}
                  {campaign.estimated_impressions_per_day && (
                    <div className="text-xs text-gray-400">
                      {t("annonceur.facture.impressions", { n: campaign.estimated_impressions_per_day.toLocaleString(dateLocale) })}
                    </div>
                  )}
                </td>
                <td className="py-3 text-right text-gray-700">
                  {campaign.days_count != null ? t("annonceur.facture.qty_days", { count: campaign.days_count }) : "—"}
                </td>
                <td className="py-3 text-right text-gray-700">
                  {campaign.spot_price != null ? `${Number(campaign.spot_price).toFixed(2)} €` : "—"}
                </td>
                <td className="py-3 text-right font-semibold text-gray-900">
                  {totalHT.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-56">
              <div className="flex justify-between py-1.5 text-gray-600">
                <span>{t("annonceur.facture.subtotal_ht")}</span>
                <span>{totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between py-1.5 text-gray-500 text-xs">
                <span>{t("annonceur.facture.vat")}</span>
                <span>{t("annonceur.facture.vat_exempt")}</span>
              </div>
              <div
                className="flex justify-between py-2 mt-1 font-bold text-gray-900 text-base"
                style={{ borderTop: "2px solid #111827" }}
              >
                <span>{t("annonceur.facture.total_ttc")}</span>
                <span>{totalHT.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* TVA note */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500 mb-8">
            {t("annonceur.facture.tva_note")}
          </div>

          {/* Route zones */}
          {campaign.route_zones && campaign.route_zones.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("annonceur.facture.zones_label")}</div>
              <div className="text-xs text-gray-600">{campaign.route_zones.join(", ")}</div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
            MoveSpot — RAKOUN KLUB · SIRET en cours d'enregistrement · contact@movespot.fr<br />
            1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
          </div>
        </div>
      </div>
    </>
  );
}
