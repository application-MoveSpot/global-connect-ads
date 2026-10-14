import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { toast } from "sonner";
import {
  getCommissionRates,
  addCommissionRate,
  getCampaignMarginStats,
  type CommissionRate,
  type MarginRow,
  type CommissionTier,
} from "@/lib/payments/commission.functions";

export const Route = createFileRoute("/admin/commissions")({
  head: () => ({
    meta: [
      { title: "Commissions — Admin MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CommissionsAdmin,
});

type MarginSummary = {
  totalRevenueCents: number;
  totalPlatformFeeCents: number;
  totalNetMarginCents: number;
  totalStripeFeeCents: number;
  negativeMarginCount: number;
  campaignCount: number;
};

function bpsToPercent(bps: number) {
  return (bps / 100).toFixed(1) + " %";
}

function CommissionsAdmin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<"checking" | "ok" | "denied">("checking");
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [marginRows, setMarginRows] = useState<MarginRow[]>([]);
  const [summary, setSummary] = useState<MarginSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [newTier, setNewTier] = useState<CommissionTier>("particulier");
  const [newRatePct, setNewRatePct] = useState("30");
  const [newMinFee, setNewMinFee] = useState("1.00");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function fmt(cents: number) {
    return (
      (cents / 100).toLocaleString(i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €"
    );
  }

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: isAdmin } = await (
        supabase.rpc as unknown as (fn: string) => Promise<{ data: boolean | null }>
      )("check_is_admin");
      if (!isAdmin) {
        setAuth("denied");
        return;
      }
      setAuth("ok");
    })();
  }, [navigate]);

  useEffect(() => {
    if (auth !== "ok") return;
    (async () => {
      setLoading(true);
      try {
        const [ratesRes, marginRes] = await Promise.all([
          getCommissionRates(),
          getCampaignMarginStats(),
        ]);
        setRates(ratesRes.rates);
        setMarginRows(marginRes.rows);
        setSummary(marginRes.summary);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("admin.commissions.loading_error"));
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(newRatePct);
    if (isNaN(pct) || pct < 5 || pct > 50) {
      toast.error(t("admin.commissions.rate_error"));
      return;
    }
    const minFeeEur = parseFloat(newMinFee);
    if (isNaN(minFeeEur) || minFeeEur < 0) {
      toast.error(t("admin.commissions.floor_error"));
      return;
    }

    setSaving(true);
    try {
      const { rate } = await addCommissionRate({
        tier: newTier,
        rate_bps: Math.round(pct * 100),
        min_fee_cents: Math.round(minFeeEur * 100),
        notes: newNotes || undefined,
      });
      setRates((prev) => [rate, ...prev]);
      toast.success(
        t("admin.commissions.rate_added", {
          tier: t(`admin.commissions.tier_${newTier}`),
          rate: pct,
        }),
      );
      setNewNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (auth === "checking")
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("admin.commissions.checking")}
      </div>
    );
  if (auth === "denied")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("admin.commissions.denied")}</p>
      </div>
    );

  const currentRates = (["particulier", "pme", "enterprise"] as CommissionTier[]).map((tier) => {
    const r = rates
      .filter((x) => x.tier === tier)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    return { tier, rate: r ?? null };
  });

  const loc = i18n.language;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-xl font-bold mt-0.5">
              {t("admin.commissions.title")}
            </h1>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.commissions.back")}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Taux en vigueur */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">
            {t("admin.commissions.rates_section")}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {currentRates.map(({ tier, rate }) => (
              <div key={tier} className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  {t(`admin.commissions.tier_${tier}`)}
                </div>
                {rate ? (
                  <>
                    <div className="font-display text-3xl font-bold text-primary">
                      {bpsToPercent(rate.rate_bps)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t("admin.commissions.floor", { amount: fmt(rate.min_fee_cents) })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {t("admin.commissions.since", {
                        date: new Date(rate.effective_from).toLocaleDateString(loc),
                      })}
                    </div>
                    {rate.notes && (
                      <div className="text-xs text-muted-foreground/70 mt-1 italic">
                        {rate.notes}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("admin.commissions.no_rate")}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t("admin.commissions.rates_note")}</p>
        </section>

        {/* Ajouter un nouveau taux */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold mb-4">
            {t("admin.commissions.edit_section")}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">{t("admin.commissions.edit_note")}</p>
          <form onSubmit={handleAddRate} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                {t("admin.commissions.label_tier")}
              </label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as CommissionTier)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                {(["particulier", "pme", "enterprise"] as CommissionTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {t(`admin.commissions.tier_${tier}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                {t("admin.commissions.label_rate")}
              </label>
              <input
                type="number"
                min="5"
                max="50"
                step="0.5"
                value={newRatePct}
                onChange={(e) => setNewRatePct(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                {t("admin.commissions.label_floor")}
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.10"
                value={newMinFee}
                onChange={(e) => setNewMinFee(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("admin.commissions.floor_hint")}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">
                {t("admin.commissions.label_note")}
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder={t("admin.commissions.placeholder_note")}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? t("admin.commissions.saving") : t("admin.commissions.apply")}
              </button>
            </div>
          </form>
        </section>

        {/* Stats de marge */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">
            {t("admin.commissions.margin_section")}
          </h2>

          {loading ? (
            <div className="animate-pulse h-32 rounded-xl bg-muted" />
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    labelKey: "admin.commissions.kpi_revenue",
                    value: fmt(summary.totalRevenueCents),
                    accent: false,
                  },
                  {
                    labelKey: "admin.commissions.kpi_commission",
                    value: fmt(summary.totalPlatformFeeCents),
                    accent: false,
                  },
                  {
                    labelKey: "admin.commissions.kpi_stripe",
                    value: fmt(summary.totalStripeFeeCents),
                    accent: false,
                  },
                  {
                    labelKey: "admin.commissions.kpi_margin",
                    value: fmt(summary.totalNetMarginCents),
                    accent: summary.totalNetMarginCents < 0,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.labelKey}
                    className={`rounded-xl border p-4 ${kpi.accent ? "border-destructive/40 bg-destructive/10" : "border-border bg-card"}`}
                  >
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {t(kpi.labelKey)}
                    </div>
                    <div
                      className={`font-display text-2xl font-bold ${kpi.accent ? "text-destructive" : ""}`}
                    >
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>

              {summary.negativeMarginCount > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 mb-5 text-sm">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t("admin.commissions.negative_warning", {
                        count: summary.negativeMarginCount,
                      }),
                    }}
                  />
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/20 text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        {t("admin.commissions.col_campaign")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        {t("admin.commissions.col_date")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        {t("admin.commissions.col_amount")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        {t("admin.commissions.col_commission")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        {t("admin.commissions.col_rate")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        {t("admin.commissions.col_stripe")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        {t("admin.commissions.col_margin")}
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        {t("admin.commissions.col_tier")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginRows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                      >
                        <td className="px-4 py-2.5 font-medium truncate max-w-[160px]">
                          {row.spot_name ?? row.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {row.paid_at ? new Date(row.paid_at).toLocaleDateString(loc) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">{fmt(row.paid_amount_cents)}</td>
                        <td className="px-4 py-2.5 text-right text-primary font-medium">
                          {fmt(row.platform_fee_cents)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {bpsToPercent(row.effective_rate_bps)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {fmt(row.stripe_fee_estimate_cents)}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-medium ${row.net_margin_cents < 0 ? "text-destructive" : "text-signal"}`}
                        >
                          {fmt(row.net_margin_cents)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {row.advertiser_tier ?? "—"}
                        </td>
                      </tr>
                    ))}
                    {marginRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          {t("admin.commissions.no_campaigns")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>

        {/* Historique des taux */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">
            {t("admin.commissions.history_section")}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/20 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.commissions.col_tier")}
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.commissions.label_rate")}
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.commissions.col_floor")}
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.commissions.col_since")}
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    {t("admin.commissions.col_note")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {t(`admin.commissions.tier_${r.tier}`)}
                    </td>
                    <td className="px-4 py-2.5 text-primary font-semibold">
                      {bpsToPercent(r.rate_bps)}
                    </td>
                    <td className="px-4 py-2.5">{fmt(r.min_fee_cents)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(r.effective_from).toLocaleString(loc)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      {t("admin.commissions.no_history")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
