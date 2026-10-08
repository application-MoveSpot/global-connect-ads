import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  adminExportAuditData,
  adminDetectGpsFraud,
  adminDetectIdentityFraud,
  type AuditExportResult,
  type GpsFraudFlag,
  type IdentityFraudFlag,
} from "@/lib/admin/audit-export.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { toast } from "sonner";
import { AlertTriangle, Download, FileText, Loader2, Shield, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit & Conformité — Admin MoveSpot" }, { name: "robots", content: "noindex" }] }),
  component: AdminAuditPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(";"),
    ),
  ];
  return lines.join("\n");
}

function downloadCSV(content: string, filename: string) {
  const bom = "﻿";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const exportAudit = useServerFn(adminExportAuditData);
  const detectGps = useServerFn(adminDetectGpsFraud);
  const detectIdentity = useServerFn(adminDetectIdentityFraud);

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const [auditData, setAuditData] = useState<AuditExportResult | null>(null);
  const [gpsFrauds, setGpsFrauds] = useState<GpsFraudFlag[] | null>(null);
  const [idFrauds, setIdFrauds] = useState<IdentityFraudFlag[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingFraud, setLoadingFraud] = useState(false);

  function fmt(cents: number) {
    return (cents / 100).toLocaleString(i18n.language, { style: "currency", currency: "EUR" });
  }

  function severityLabel(s: "high" | "medium" | "low") {
    return s === "high" ? t("admin.audit.severity_high") : s === "medium" ? t("admin.audit.severity_medium") : t("admin.audit.severity_low");
  }

  function severityBadge(s: "high" | "medium" | "low") {
    const cls =
      s === "high" ? "bg-destructive/15 text-destructive border-destructive/30" :
      s === "medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-400/30" :
      "bg-secondary text-muted-foreground border-border";
    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
        {severityLabel(s)}
      </span>
    );
  }

  const handleExport = async () => {
    setLoadingAudit(true);
    try {
      const result = await exportAudit({ data: { dateFrom, dateTo } });
      setAuditData(result);
      toast.success(t("admin.audit.loaded"));
    } catch (e: any) {
      toast.error(e?.message ?? t("admin.audit.load_error"));
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDetectFraud = async () => {
    setLoadingFraud(true);
    try {
      const [gps, identity] = await Promise.all([
        detectGps({ data: { dateFrom, dateTo } }),
        detectIdentity({ data: {} }),
      ]);
      setGpsFrauds(gps.flags);
      setIdFrauds(identity.flags);
      const total = gps.flags.length + identity.flags.length;
      if (total === 0) toast.success(t("admin.audit.no_anomaly", { n: gps.analyzedPoints }));
      else toast.warning(t("admin.audit.anomalies_found", { total }));
    } catch (e: any) {
      toast.error(e?.message ?? t("admin.audit.detect_error"));
    } finally {
      setLoadingFraud(false);
    }
  };

  const downloadAll = () => {
    if (!auditData) return;
    const ts = dateFrom + "_" + dateTo;

    downloadCSV(
      toCSV(auditData.campaigns.map((c) => ({
        "ID Campagne": c.id,
        "Date création": c.createdAt.slice(0, 10),
        "Statut": c.status,
        "Annonceur": c.advertiserName,
        "Société": c.advertiserCompany ?? "",
        "SIRET": c.advertiserSiret ?? "",
        "Propriétaire": c.vehicleOwnerName ?? "",
        "Véhicule": c.vehicleName ?? "",
        "Nom spot": c.spotName ?? "",
        "Début": c.startDate ?? "",
        "Fin": c.endDate ?? "",
        "Montant (€)": c.totalPriceCents != null ? (c.totalPriceCents / 100).toFixed(2) : "",
        "Paiement": c.paymentStatus,
        "Points GPS": c.gpsPointsCount,
      }))),
      `movespot_campagnes_${ts}.csv`,
    );

    downloadCSV(
      toCSV(auditData.walletTransactions.map((t) => ({
        "ID": t.id,
        "Date": t.createdAt.slice(0, 10),
        "Type": t.type,
        "Montant (€)": (t.amountCents / 100).toFixed(2),
        "Utilisateur": t.userName ?? "",
        "SIRET": t.userSiret ?? "",
        "Description": t.description ?? "",
        "ID Campagne": t.campaignId ?? "",
      }))),
      `movespot_transactions_${ts}.csv`,
    );

    downloadCSV(
      toCSV(auditData.bankTransfers.map((t) => ({
        "ID": t.id,
        "Date": t.createdAt.slice(0, 10),
        "Référence": t.reference,
        "Montant (€)": (t.amountCents / 100).toFixed(2),
        "Statut": t.status,
        "Utilisateur": t.userName ?? "",
        "ID Campagne": t.campaignId ?? "",
      }))),
      `movespot_virements_${ts}.csv`,
    );

    toast.success(t("admin.audit.csv_downloaded"));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/admin/dashboard" className="hover:text-foreground">{t("admin.audit.nav_dashboard")}</Link>
            <Link to="/admin/virements" className="hover:text-foreground">{t("admin.audit.nav_transfers")}</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.audit.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.audit.desc")}</p>
        </div>

        {/* Sélecteur de période */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> {t("admin.audit.period_section")}</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">{t("admin.audit.from")}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">{t("admin.audit.to")}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={loadingAudit}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {loadingAudit ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {t("admin.audit.load_btn")}
              </button>
              <button
                onClick={handleDetectFraud}
                disabled={loadingFraud}
                className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-2 text-sm font-semibold hover:bg-destructive/20 disabled:opacity-50"
              >
                {loadingFraud ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                {t("admin.audit.detect_btn")}
              </button>
            </div>
          </div>
        </section>

        {/* Résumé + téléchargement */}
        {auditData && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { labelKey: "admin.audit.kpi_campaigns", value: auditData.summary.totalCampaigns },
                { labelKey: "admin.audit.kpi_revenue", value: fmt(auditData.summary.totalRevenueCents) },
                { labelKey: "admin.audit.kpi_commissions", value: fmt(auditData.summary.totalCommissionsCents) },
                { labelKey: "admin.audit.kpi_transfers", value: fmt(auditData.summary.totalTransfersCents) },
                { labelKey: "admin.audit.kpi_advertisers", value: auditData.summary.uniqueAdvertisers },
                { labelKey: "admin.audit.kpi_owners", value: auditData.summary.uniqueOwners },
              ].map((s) => (
                <div key={s.labelKey} className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t(s.labelKey)}</div>
                  <div className="font-bold text-sm mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={downloadAll}
              className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("admin.audit.download_csv")}
            </button>

            <p className="text-xs text-muted-foreground">{t("admin.audit.csv_note")}</p>

            {/* Tableau campagnes */}
            <details className="rounded-2xl border border-border bg-card overflow-hidden">
              <summary className="px-5 py-3 font-semibold text-sm cursor-pointer hover:bg-secondary/30">
                {t("admin.audit.campaigns_summary", { n: auditData.campaigns.length })}
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50">
                    <tr>
                      {[
                        t("admin.audit.col_date"), t("admin.audit.col_advertiser"), t("admin.audit.col_siret"),
                        t("admin.audit.col_vehicle"), t("admin.audit.col_spot"), t("admin.audit.col_start"),
                        t("admin.audit.col_end"), t("admin.audit.col_amount"), t("admin.audit.col_payment"), t("admin.audit.col_gps"),
                      ].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditData.campaigns.slice(0, 50).map((c) => (
                      <tr key={c.id} className="hover:bg-secondary/20">
                        <td className="px-3 py-2 whitespace-nowrap">{c.createdAt.slice(0, 10)}</td>
                        <td className="px-3 py-2">{c.advertiserName}</td>
                        <td className="px-3 py-2 font-mono">{c.advertiserSiret ?? "—"}</td>
                        <td className="px-3 py-2">{c.vehicleName ?? "—"}</td>
                        <td className="px-3 py-2">{c.spotName ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{c.startDate ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{c.endDate ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.totalPriceCents != null ? fmt(c.totalPriceCents) : "—"}</td>
                        <td className="px-3 py-2">{c.paymentStatus}</td>
                        <td className="px-3 py-2 text-right">{c.gpsPointsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditData.campaigns.length > 50 && (
                  <p className="px-5 py-2 text-xs text-muted-foreground">{t("admin.audit.more_in_csv", { n: auditData.campaigns.length - 50 })}</p>
                )}
              </div>
            </details>
          </section>
        )}

        {/* Fraudes GPS */}
        {gpsFrauds !== null && (
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              {t("admin.audit.gps_section", { n: gpsFrauds.length })}
            </h2>

            {gpsFrauds.length === 0 ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t("admin.audit.gps_clear")}
              </div>
            ) : (
              <div className="space-y-3">
                {gpsFrauds.map((f, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                        <span className="font-semibold text-sm">{f.vehicleName}</span>
                        {severityBadge(f.severity)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{f.detectedAt.slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                    <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                      {f.flagType === "speed_anomaly" ? t("admin.audit.flag_speed") :
                       f.flagType === "static_spoofing" ? t("admin.audit.flag_spoofing") :
                       f.flagType === "no_movement" ? t("admin.audit.flag_no_movement") : f.flagType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Fraudes identité / paiement */}
        {idFrauds !== null && (
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              {t("admin.audit.id_section", { n: idFrauds.length })}
            </h2>

            {idFrauds.length === 0 ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t("admin.audit.id_clear")}
              </div>
            ) : (
              <div className="space-y-3">
                {idFrauds.map((f, i) => (
                  <div key={i} className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-sm">{severityBadge(f.severity)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">
                      {t("admin.audit.ids_prefix")} {f.affectedUserIds.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
