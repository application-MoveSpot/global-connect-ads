import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  getCommercialDashboard,
  updateCommercialLegalInfo,
  getCommercialMonthlyStatement,
  type CommercialProfile,
  type CommercialClient,
  type CommercialCampaign,
} from "@/lib/commercial/commercial.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { NetworkErrorBanner } from "@/components/app/NetworkErrorBanner";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import {
  Copy,
  Check,
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  Lightbulb,
  Shield,
  FileText,
  Download,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/commercial/")({
  head: () => ({
    meta: [
      { title: "Espace commercial — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CommercialDashboard,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-600 bg-amber-500/10",
  approved: "text-emerald-600 bg-emerald-500/10",
  paid: "text-emerald-600 bg-emerald-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  rejected: "text-red-600 bg-red-500/10",
};

function KitMessage({
  icon,
  label,
  msgKey,
  copiedKey,
  onCopy,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  msgKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  text: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <button
          onClick={() => onCopy(msgKey, text)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition"
        >
          {copiedKey === msgKey ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copiedKey === msgKey ? t("common.copied") : t("common.copy")}
        </button>
      </div>
      <pre className="text-xs text-muted-foreground bg-background border border-border rounded-lg p-3 whitespace-pre-wrap leading-relaxed font-sans">
        {text}
      </pre>
    </div>
  );
}

const LEGAL_STATUSES = ["auto_entrepreneur", "sas", "sarl", "eurl", "ei", "other"] as const;

function CommercialDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dashFn = useServerFn(getCommercialDashboard);
  const updateLegalFn = useServerFn(updateCommercialLegalInfo);
  const statementFn = useServerFn(getCommercialMonthlyStatement);

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommercialProfile | null>(null);
  const [clients, setClients] = useState<CommercialClient[]>([]);
  const [campaigns, setCampaigns] = useState<CommercialCampaign[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [paidCents, setPaidCents] = useState(0);
  const [copied, setCopied] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [copiedKit, setCopiedKit] = useState<string | null>(null);

  // Legal info state
  const [siret, setSiret] = useState("");
  const [legalStatus, setLegalStatus] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalSaved, setLegalSaved] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);

  // Commission statement state
  const now = new Date();
  const [stmtYear, setStmtYear] = useState(now.getFullYear());
  const [stmtMonth, setStmtMonth] = useState(now.getMonth() + 1);
  const [stmtGenerating, setStmtGenerating] = useState(false);

  const load = useCallback(
    async (isRetry = false) => {
      if (isRetry) setRetrying(true);
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/commercial/inscription" });
        return;
      }
      try {
        const res = await dashFn({ data: {} });
        if (!res.ok) {
          if (res.error?.includes("introuvable")) {
            navigate({ to: "/commercial/inscription" });
            return;
          }
          setError(res.error ?? t("common.error"));
        } else {
          setError(null);
          setProfile(res.profile);
          setClients(res.clients);
          setCampaigns(res.campaigns);
          setTotalCents(res.totalCommissionCents);
          setPaidCents(res.paidCommissionCents);
          setSiret(res.profile.siret ?? "");
          setLegalStatus(res.profile.legal_status ?? "");
          setLegalAddress(res.profile.legal_address ?? "");
        }
      } catch {
        setError(t("commercial.dashboard.load_error"));
      } finally {
        setLoading(false);
        setRetrying(false);
      }
    },
    [dashFn, navigate],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const saveLegalInfo = async () => {
    setLegalSaving(true);
    setLegalError(null);
    try {
      const res = await updateLegalFn({
        data: {
          siret: siret.trim() || null,
          legal_status: (legalStatus as CommercialProfile["legal_status"]) || null,
          legal_address: legalAddress.trim() || null,
        },
      });
      if (!res.ok) setLegalError(res.error ?? t("commercial.dashboard.legal_save_error"));
      else {
        setLegalSaved(true);
        setTimeout(() => setLegalSaved(false), 2500);
      }
    } catch {
      setLegalError(t("commercial.dashboard.legal_save_error"));
    } finally {
      setLegalSaving(false);
    }
  };

  const downloadStatement = async () => {
    setStmtGenerating(true);
    try {
      const res = await statementFn({ data: { year: stmtYear, month: stmtMonth } });
      if (!res.ok) return;
      const { profile: p, campaigns: camps, totalCents: tot, paidCents: paid, year, month } = res;
      const monthName = new Date(year, month - 1, 1).toLocaleString(i18n.language, { month: "long", year: "numeric" });
      const fmt = (cents: number) => (cents / 100).toLocaleString(i18n.language, { style: "currency", currency: "EUR" });

      const rows = camps
        .map(
          (c: CommercialCampaign) => `<tr>
          <td>${new Date(c.created_at).toLocaleDateString(i18n.language)}</td>
          <td>${c.company ?? "—"}</td>
          <td>${c.spot_name ?? "—"}</td>
          <td style="text-align:right">${c.total_price != null ? fmt(c.total_price * 100) : "—"}</td>
          <td style="text-align:right">${c.commission_amount_cents != null ? fmt(c.commission_amount_cents) : "—"}</td>
          <td style="text-align:center">${c.commission_paid_at ? "✓" : "—"}</td>
        </tr>`,
        )
        .join("");

      const html = `<!DOCTYPE html><html lang="${i18n.language}"><head><meta charset="UTF-8">
<title>Relevé commissions — ${monthName}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:32px}
  h1{font-size:18px;margin-bottom:4px}
  .meta{color:#555;margin-bottom:24px;font-size:11px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f3f4f6;text-align:left;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:6px;border-bottom:1px solid #e5e7eb}
  .totals{margin-top:16px;text-align:right;font-size:13px}
  .totals strong{font-size:15px}
  .footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #e5e7eb;padding-top:12px}
  @media print{body{margin:20px}}
</style></head><body>
<h1>Relevé de commissions — ${monthName}</h1>
<div class="meta">
  ${p.full_name}${p.company ? ` · ${p.company}` : ""}${p.siret ? ` · SIRET : ${p.siret}` : ""}${p.legal_address ? `<br>${p.legal_address}` : ""}<br>
  Code parrainage : <strong>${p.referral_code}</strong><br>
  Taux de commission : ${Math.round(p.commission_rate * 100)} %
</div>
${
  camps.length === 0
    ? `<p style="color:#888;margin-top:24px">${t("commercial.dashboard.statement_empty")}</p>`
    : `<table>
  <thead><tr>
    <th>Date</th><th>Annonceur</th><th>Campagne</th>
    <th style="text-align:right">Montant camp.</th>
    <th style="text-align:right">Commission</th>
    <th style="text-align:center">Versée</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  ${t("commercial.dashboard.statement_total")} <strong>${fmt(tot)}</strong><br>
  ${t("commercial.dashboard.statement_paid")} <span style="color:#059669">${fmt(paid)}</span><br>
  ${t("commercial.dashboard.statement_pending")} <span style="color:#d97706">${fmt(tot - paid)}</span>
</div>`
}
<div class="footer">
  Document généré le ${new Date().toLocaleDateString(i18n.language)} — MoveSpot · contact@move-spot.com<br>
  Ce relevé est fourni à titre informatif. Les commissions sont versées par virement bancaire selon les conditions contractuelles.
</div>
</body></html>`;

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    } finally {
      setStmtGenerating(false);
    }
  };

  const referralLink = profile
    ? `${typeof window !== "undefined" ? window.location.origin : "https://movespot.fr"}/advertiser/inscription?ref=${profile.referral_code}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied
    }
  };

  const copyKit = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKit(key);
      setTimeout(() => setCopiedKit(null), 2000);
    } catch {
      // clipboard denied
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-t-2 border-t-rose-400 border-b border-border backdrop-blur light-band">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">
              {t("commercial.dashboard.title")}
            </h1>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("commercial.dashboard.home")}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <NetworkErrorBanner message={error} onRetry={() => load(true)} retrying={retrying} />
        )}

        {/* Lien de parrainage */}
        {profile && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("commercial.dashboard.referral_link_label")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("commercial.dashboard.referral_link_desc")}
                </p>
              </div>
              <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded-full">
                {profile.referral_code}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-xs bg-background border border-border rounded-lg px-3 py-2 truncate">
                {referralLink}
              </code>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-secondary transition"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("commercial.dashboard.commission_rate", {
                rate: Math.round((profile.commission_rate ?? 0.1) * 100),
              })}
            </p>
          </div>
        )}

        {/* Kit de prospection */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setKitOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-secondary/50 transition"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm">{t("commercial.dashboard.kit_title")}</span>
              <span className="text-xs text-muted-foreground">
                {t("commercial.dashboard.kit_subtitle")}
              </span>
            </div>
            {kitOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {kitOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
              <KitMessage
                icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
                label={t("commercial.dashboard.kit_whatsapp_label")}
                msgKey="whatsapp"
                copiedKey={copiedKit}
                onCopy={copyKit}
                text={`Bonjour, je vous contacte de la part de MoveSpot — une plateforme de publicité sur véhicules en mouvement (taxi, VTC, utilitaires).\n\nVous payez uniquement au km² réel parcouru dans votre zone, prouvé par GPS. Pas d'engagement minimum.\n\nJe peux vous créer un accès gratuitement si vous êtes intéressé(e). Votre lien d'inscription : ${referralLink || "[votre lien ici]"}`}
              />
              <KitMessage
                icon={<Mail className="w-4 h-4 text-blue-500" />}
                label={t("commercial.dashboard.kit_email_label")}
                msgKey="email"
                copiedKey={copiedKit}
                onCopy={copyKit}
                text={`Objet : Publicité mobile géolocalisée — sans abonnement\n\nBonjour,\n\nJe vous présente MoveSpot, une solution de publicité mobile sur véhicules (taxis, VTC, camionnettes) circulant dans votre zone de chalandise.\n\nPourquoi c'est différent :\n• Vous payez uniquement au km² réel parcouru (prouvé par GPS)\n• Pas d'engagement, pas d'abonnement\n• Vos visuels posés sur des véhicules qui circulent là où sont vos clients\n\nJe serais heureux(se) de vous montrer comment ça fonctionne. Vous pouvez créer votre compte gratuitement ici : ${referralLink || "[votre lien ici]"}\n\nCordialement`}
              />
              <div className="rounded-xl bg-secondary/50 border border-border p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("commercial.dashboard.kit_args_title")}
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {[
                    t("commercial.dashboard.kit_arg1"),
                    t("commercial.dashboard.kit_arg2"),
                    t("commercial.dashboard.kit_arg3"),
                    t("commercial.dashboard.kit_arg4"),
                    t("commercial.dashboard.kit_arg5"),
                  ].map((arg) => (
                    <li key={arg} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Résumé chiffres */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("commercial.dashboard.clients_count")}
              </p>
            </div>
            <p className="font-display text-3xl font-bold">{clients.length}</p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("commercial.dashboard.commissions_generated")}
            </p>
            <p className="font-display text-3xl font-bold text-primary">
              {(totalCents / 100).toLocaleString(i18n.language, {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("commercial.dashboard.commissions_paid")}
              </p>
            </div>
            <p className="font-display text-3xl font-bold text-emerald-600">
              {(paidCents / 100).toLocaleString(i18n.language, {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>
        </div>

        {/* Clients */}
        <section>
          <h2 className="font-semibold text-lg mb-3">
            {t("commercial.dashboard.clients_title", { count: clients.length })}
          </h2>
          {clients.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {t("commercial.dashboard.no_clients")}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {t("commercial.dashboard.no_clients_hint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card px-5 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-sm">{c.full_name}</p>
                    {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(c.created_at).toLocaleDateString(i18n.language)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Campagnes */}
        <section>
          <h2 className="font-semibold text-lg mb-3">
            {t("commercial.dashboard.campaigns_title", { count: campaigns.length })}
          </h2>
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground text-sm">
                {t("commercial.dashboard.no_campaigns")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((camp) => {
                const stColor = STATUS_COLORS[camp.status] ?? "text-muted-foreground bg-muted";
                const stLabel = t(`commercial.dashboard.status_${camp.status}`, {
                  defaultValue: camp.status,
                });
                return (
                  <div key={camp.id} className="rounded-xl border border-border bg-card px-5 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">
                            {camp.spot_name}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stColor}`}
                          >
                            {stLabel}
                          </span>
                          {camp.commission_paid_at && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
                              {t("commercial.dashboard.commission_paid_badge")}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm mt-0.5">{camp.company}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {camp.commission_amount_cents != null && (
                          <p className="font-display text-lg font-bold text-primary">
                            {(camp.commission_amount_cents / 100).toLocaleString(i18n.language, {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </p>
                        )}
                        {camp.total_price != null && (
                          <p className="text-xs text-muted-foreground">
                            {t("commercial.dashboard.campaign_amount")}{" "}
                            {camp.total_price.toLocaleString(i18n.language, {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Note de versement */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">
            {t("commercial.dashboard.payment_note_title")}
          </strong>{" "}
          {t("commercial.dashboard.payment_note_body")}{" "}
          <a href="mailto:contact@move-spot.com" className="underline text-foreground">
            contact@move-spot.com
          </a>{" "}
          {t("commercial.dashboard.payment_note_suffix")}
        </div>

        {/* ── Relevés de commissions ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">
              {t("commercial.dashboard.statement_section_title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("commercial.dashboard.statement_section_subtitle")}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                {t("commercial.dashboard.statement_month_label")}
              </label>
              <select
                value={stmtMonth}
                onChange={(e) => setStmtMonth(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(stmtYear, m - 1, 1).toLocaleString(i18n.language, { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                {t("commercial.dashboard.statement_year_label")}
              </label>
              <select
                value={stmtYear}
                onChange={(e) => setStmtYear(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={downloadStatement}
              disabled={stmtGenerating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              <FileText className="w-4 h-4" />
              {stmtGenerating
                ? t("commercial.dashboard.statement_generating")
                : t("commercial.dashboard.statement_download_btn")}
            </button>
          </div>
        </section>

        {/* ── Informations légales ───────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">
              {t("commercial.dashboard.legal_section_title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("commercial.dashboard.legal_section_subtitle")}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                {t("commercial.dashboard.legal_siret_label")}
              </label>
              <input
                type="text"
                maxLength={14}
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, ""))}
                placeholder={t("commercial.dashboard.legal_siret_placeholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                {t("commercial.dashboard.legal_status_label")}
              </label>
              <select
                value={legalStatus}
                onChange={(e) => setLegalStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("commercial.dashboard.legal_status_placeholder")}</option>
                {LEGAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`commercial.dashboard.legal_status_${s}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-widest">
                {t("commercial.dashboard.legal_address_label")}
              </label>
              <textarea
                rows={2}
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                placeholder={t("commercial.dashboard.legal_address_placeholder")}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          {legalError && <p className="text-xs text-destructive">{legalError}</p>}
          <button
            onClick={saveLegalInfo}
            disabled={legalSaving}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              legalSaved
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            }`}
          >
            {legalSaved ? (
              <>
                <Check className="w-4 h-4" />
                {t("commercial.dashboard.legal_saved")}
              </>
            ) : (
              legalSaving
                ? t("commercial.dashboard.legal_saving")
                : t("commercial.dashboard.legal_save_btn")
            )}
          </button>
        </section>

        {/* ── CGU & Contrat ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">
              {t("commercial.dashboard.cgu_section_title")}
            </h2>
          </div>
          {profile && (
            <p className="text-sm text-muted-foreground">
              {t("commercial.dashboard.cgu_accepted_on", {
                date: new Date(profile.cgu_accepted_at ?? profile.created_at).toLocaleDateString(i18n.language),
              })}
            </p>
          )}
          <div className="rounded-xl bg-secondary/50 border border-border p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("commercial.dashboard.cgu_conduct_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("commercial.dashboard.cgu_conduct_body")}
            </p>
          </div>
        </section>

        {/* ── RGPD ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-sm">{t("commercial.dashboard.rgpd_title")}</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("commercial.dashboard.rgpd_body")}{" "}
            <a href="mailto:contact@move-spot.com" className="underline text-foreground">
              contact@move-spot.com
            </a>
            . {t("commercial.dashboard.rgpd_suffix")}
          </p>
        </section>
      </main>
    </div>
  );
}
