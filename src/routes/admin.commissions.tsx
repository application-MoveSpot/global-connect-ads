import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function bpsToPercent(bps: number) {
  return (bps / 100).toFixed(1) + " %";
}

const TIER_LABELS: Record<CommissionTier, string> = {
  particulier: "Particulier / Asso",
  pme: "PME / Startup",
  enterprise: "Grand compte",
};

function CommissionsAdmin() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<"checking" | "ok" | "denied">("checking");
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [marginRows, setMarginRows] = useState<MarginRow[]>([]);
  const [summary, setSummary] = useState<MarginSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulaire ajout taux
  const [newTier, setNewTier] = useState<CommissionTier>("particulier");
  const [newRatePct, setNewRatePct] = useState("30");
  const [newMinFee, setNewMinFee] = useState("1.00");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/auth" }); return; }
      const { data: isAdmin } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: boolean | null }>)("check_is_admin");
      if (!isAdmin) { setAuth("denied"); return; }
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
        toast.error(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(newRatePct);
    if (isNaN(pct) || pct < 5 || pct > 50) { toast.error("Taux entre 5 % et 50 %"); return; }
    const minFeeEur = parseFloat(newMinFee);
    if (isNaN(minFeeEur) || minFeeEur < 0) { toast.error("Plancher invalide"); return; }

    setSaving(true);
    try {
      const { rate } = await addCommissionRate({
        tier: newTier,
        rate_bps: Math.round(pct * 100),
        min_fee_cents: Math.round(minFeeEur * 100),
        notes: newNotes || undefined,
      });
      setRates((prev) => [rate, ...prev]);
      toast.success(`Nouveau taux ${TIER_LABELS[newTier]} : ${pct} % effectif maintenant`);
      setNewNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (auth === "checking") return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Vérification...</div>;
  if (auth === "denied") return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Accès refusé — compte admin requis.</p>
    </div>
  );

  // Taux effectifs actuels (le plus récent par tier)
  const currentRates = (["particulier", "pme", "enterprise"] as CommissionTier[]).map((tier) => {
    const r = rates.filter((x) => x.tier === tier).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    return { tier, rate: r ?? null };
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-xl font-bold mt-0.5">Commissions &amp; marges</h1>
          </div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard admin</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── Taux en vigueur ── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Taux en vigueur</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {currentRates.map(({ tier, rate }) => (
              <div key={tier} className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">{TIER_LABELS[tier]}</div>
                {rate ? (
                  <>
                    <div className="font-display text-3xl font-bold text-primary">{bpsToPercent(rate.rate_bps)}</div>
                    <div className="text-sm text-muted-foreground mt-1">Plancher : {fmt(rate.min_fee_cents)} / campagne</div>
                    <div className="text-xs text-muted-foreground mt-2">Depuis le {new Date(rate.effective_from).toLocaleDateString("fr-FR")}</div>
                    {rate.notes && <div className="text-xs text-muted-foreground/70 mt-1 italic">{rate.notes}</div>}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun taux configuré</div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Le taux est appliqué au moment du règlement. Le <strong>plancher</strong> (min_fee_cents) est le mécanisme d'auto-ajustement :
            si la commission calculée est inférieure au plancher, le plancher s'applique pour garantir la couverture des frais Stripe (~2,9 % + 0,30 €).
          </p>
        </section>

        {/* ── Ajouter un nouveau taux ── */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold mb-4">Modifier un taux</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Chaque nouvelle entrée s'ajoute à l'historique avec sa date d'effet.
            Le taux actif est toujours le plus récent pour chaque tier.
          </p>
          <form onSubmit={handleAddRate} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Tier</label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as CommissionTier)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                {(["particulier", "pme", "enterprise"] as CommissionTier[]).map((t) => (
                  <option key={t} value={t}>{TIER_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Taux (%)</label>
              <input
                type="number"
                min="5" max="50" step="0.5"
                value={newRatePct}
                onChange={(e) => setNewRatePct(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Plancher (€ / campagne)</label>
              <input
                type="number"
                min="0" max="50" step="0.10"
                value={newMinFee}
                onChange={(e) => setNewMinFee(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-ajustement si marge calculée &lt; ce montant</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Note (optionnelle)</label>
              <input
                type="text"
                maxLength={200}
                placeholder="Ex : hausse frais infrastructure"
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
                {saving ? "Enregistrement..." : "Appliquer ce taux"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Stats de marge ── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Marge nette — 100 dernières campagnes payées</h2>

          {loading ? (
            <div className="animate-pulse h-32 rounded-xl bg-muted" />
          ) : summary ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Revenu brut", value: fmt(summary.totalRevenueCents), accent: false },
                  { label: "Commission perçue", value: fmt(summary.totalPlatformFeeCents), accent: false },
                  { label: "Frais Stripe estimés", value: fmt(summary.totalStripeFeeCents), accent: false },
                  {
                    label: "Marge nette",
                    value: fmt(summary.totalNetMarginCents),
                    accent: summary.totalNetMarginCents < 0,
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.accent ? "border-destructive/40 bg-destructive/10" : "border-border bg-card"}`}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{kpi.label}</div>
                    <div className={`font-display text-2xl font-bold ${kpi.accent ? "text-destructive" : ""}`}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {summary.negativeMarginCount > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 mb-5 text-sm">
                  ⚠️ <strong>{summary.negativeMarginCount} campagne(s)</strong> ont une marge nette négative — les frais Stripe dépassent la commission perçue.
                  Envisagez de relever le <strong>plancher (min_fee_cents)</strong> ci-dessus.
                </div>
              )}

              {/* Tableau détail */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/20 text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Campagne</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Montant</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Commission</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Taux réel</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Stripe est.</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Marge nette</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginRows.map((row, i) => (
                      <tr key={row.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-4 py-2.5 font-medium truncate max-w-[160px]">{row.spot_name ?? row.id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {row.paid_at ? new Date(row.paid_at).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">{fmt(row.paid_amount_cents)}</td>
                        <td className="px-4 py-2.5 text-right text-primary font-medium">{fmt(row.platform_fee_cents)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{bpsToPercent(row.effective_rate_bps)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.stripe_fee_estimate_cents)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${row.net_margin_cents < 0 ? "text-destructive" : "text-signal"}`}>
                          {fmt(row.net_margin_cents)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.advertiser_tier ?? "—"}</td>
                      </tr>
                    ))}
                    {marginRows.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune campagne payée pour l'instant.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>

        {/* ── Historique des taux ── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Historique des taux</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/20 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Taux</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Plancher</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Depuis</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r, i) => (
                  <tr key={r.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                    <td className="px-4 py-2.5 font-medium">{TIER_LABELS[r.tier]}</td>
                    <td className="px-4 py-2.5 text-primary font-semibold">{bpsToPercent(r.rate_bps)}</td>
                    <td className="px-4 py-2.5">{fmt(r.min_fee_cents)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{new Date(r.effective_from).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun historique.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
