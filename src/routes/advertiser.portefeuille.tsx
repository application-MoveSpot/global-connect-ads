import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useCallback, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { getMyWallet, getWalletTransactions } from "@/lib/payments/wallet.functions";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { CinetPayTopupCheckout } from "@/components/advertiser/CinetPayTopupCheckout";
import {
  BankTransferCheckout,
  isStripeUnsupportedRegion,
} from "@/components/shared/BankTransferCheckout";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { RouteError } from "@/components/app/RouteError";
import { useCurrency } from "@/hooks/useCurrency";
import { useRegion } from "@/lib/region-context";
import { useWalletAnalytics } from "@/hooks/useWalletAnalytics";

export const Route = createFileRoute("/advertiser/portefeuille")({
  head: () => ({
    meta: [
      { title: "Mon portefeuille — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WalletPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type TxKind = "all" | "topup" | "campaign_debit" | "refund" | "admin_adjustment";

type WalletTx = {
  kind: string;
  amount_cents: number;
  created_at: string;
  description?: string | null;
};

const TX_KINDS: TxKind[] = ["all", "topup", "campaign_debit", "refund", "admin_adjustment"];

const PAGE_SIZE = 25;

function WalletPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { fmt, locale, fromEurCents } = useCurrency();
  const { region } = useRegion();
  const showBankTransfer = isStripeUnsupportedRegion(region);
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTransactions = useServerFn(getWalletTransactions);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [balanceCents, setBalanceCents] = useState(0);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100);

  const isIndividual = accountType === "individual";
  const analytics = useWalletAnalytics(userId, balanceCents, isIndividual);

  const [filterKind, setFilterKind] = useState<TxKind>("all");
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Declared before refs so the refs can capture this function
  const loadTransactions = useCallback(
    async (kind: TxKind, p: number) => {
      setTxLoading(true);
      try {
        const r = await fetchTransactions({ data: { kind, page: p, pageSize: PAGE_SIZE } });
        setTransactions(r.transactions);
        setTotal(r.total);
      } catch {
        setTransactions([]);
        setTotal(0);
      } finally {
        setTxLoading(false);
      }
    },
    [fetchTransactions],
  );

  // Stable refs so realtime callback always uses current values without re-subscribing
  const loadTransactionsRef = useRef(loadTransactions);
  loadTransactionsRef.current = loadTransactions;
  const filterKindRef = useRef(filterKind);
  filterKindRef.current = filterKind;
  const pageRef = useRef(page);
  pageRef.current = page;

  // Load balance once
  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      setUserId(session.user.id);
      const [walletResult, profResult] = await Promise.allSettled([
        fetchWallet(),
        supabase
          .from("advertiser_profiles")
          .select("account_type")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);
      if (walletResult.status === "fulfilled") setBalanceCents(walletResult.value.balance_cents);
      if (profResult.status === "fulfilled") {
        const prof = profResult.value.data as { account_type?: string } | null;
        const at = prof?.account_type ?? null;
        setAccountType(at);
        setAmount(at === "individual" ? 79 : 100);
      }
      setAuthReady(true);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: balance auto-refresh when a new wallet transaction arrives (e.g. bank transfer approved)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`wallet-realtime-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const tx = payload.new as { amount_cents: number; kind: string };
          setBalanceCents((prev) => prev + tx.amount_cents);
          if (tx.kind === "topup") toast.success(t("wallet.topup_success"));
          void loadTransactionsRef.current(filterKindRef.current, pageRef.current);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Reload transactions when filter or page changes
  useEffect(() => {
    if (!authReady) return;
    void loadTransactions(filterKind, page);
  }, [authReady, filterKind, page, loadTransactions]);

  function handleFilter(kind: TxKind) {
    setFilterKind(kind);
    setPage(0);
  }

  async function exportPdfReport() {
    setTxLoading(true);
    try {
      const r = await fetchTransactions({ data: { kind: "all", page: 0, pageSize: 5000 } });
      const rows = r.transactions as WalletTx[];
      const balanceEur = (balanceCents / 100).toFixed(2);
      const totalTopup = (rows.filter((tx) => tx.kind === "topup").reduce((s, tx) => s + tx.amount_cents, 0) / 100).toFixed(2);
      const totalSpent = Math.abs(rows.filter((tx) => tx.kind === "campaign_debit").reduce((s, tx) => s + tx.amount_cents, 0) / 100).toFixed(2);
      const burnLine = analytics.burnRateEurPerDay > 0
        ? `<div><label>Burn rate moyen</label><div class="val">${analytics.burnRateEurPerDay.toFixed(2)} €/j</div></div>`
        : "";
      const rowsHtml = rows
        .map((tx) => {
          const sign = tx.amount_cents >= 0;
          return `<tr><td>${new Date(tx.created_at).toLocaleString("fr-FR")}</td><td>${tx.kind}</td><td>${tx.description ?? ""}</td><td class="${sign ? "pos" : "neg"}">${sign ? "+" : ""}${(tx.amount_cents / 100).toFixed(2)} €</td></tr>`;
        })
        .join("");
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport financier MoveSpot</title>
<style>
body{font-family:system-ui,sans-serif;padding:2rem;color:#111}h1{margin-bottom:.25rem}
.meta{color:#666;font-size:.875rem;margin-bottom:1.5rem}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{background:#f3f4f6;text-align:left;padding:.5rem .75rem;border-bottom:2px solid #e5e7eb}
td{padding:.5rem .75rem;border-bottom:1px solid #e5e7eb}
.pos{color:#16a34a}.neg{color:#dc2626}
.summary{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem}
.summary>div{background:#f9fafb;border-radius:.5rem;padding:1rem 1.5rem;min-width:10rem}
.summary label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.summary .val{font-size:1.5rem;font-weight:700;margin-top:.25rem}
@media print{body{padding:0}}
</style></head><body>
<h1>Rapport de performance financier</h1>
<p class="meta">MoveSpot · ${new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })} · ${rows.length} transactions</p>
<div class="summary">
  <div><label>Solde disponible</label><div class="val">${balanceEur} €</div></div>
  <div><label>Total rechargé</label><div class="val">${totalTopup} €</div></div>
  <div><label>Dépensé (campagnes)</label><div class="val">${totalSpent} €</div></div>
  ${burnLine}
</div>
<table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Montant</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
</body></html>`;
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    } finally {
      setTxLoading(false);
    }
  }

  async function exportCsv() {
    setTxLoading(true);
    try {
      const r = await fetchTransactions({ data: { kind: filterKind, page: 0, pageSize: 5000 } });
      const header = ["Date", "Type", "Description", "Montant"];
      const rows = r.transactions.map((tx: any) => [
        new Date(tx.created_at).toLocaleString(locale),
        t(`wallet.tx_label.${tx.kind}` as Parameters<typeof t>[0]) ?? tx.kind,
        tx.description ?? "",
        (tx.amount_cents / 100).toFixed(2).replace(".", ","),
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movespot-portefeuille-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTxLoading(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/advertiser"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("wallet.back_to_dashboard")}
          </Link>
        </div>
      </header>

      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="font-display text-3xl font-bold mb-2">{t("wallet.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {accountType === "individual"
              ? t("wallet.subtitle_individual")
              : t("wallet.subtitle_business")}
          </p>
          {accountType === "individual" && (
            <Link
              to="/advertiser/pack"
              className="inline-block mt-1 text-xs text-primary hover:underline"
            >
              {t("wallet.see_packs")}
            </Link>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("wallet.balance")}
          </div>
          <div className="font-display text-5xl font-bold mt-2">
            {fmt(fromEurCents(balanceCents))}
          </div>
          {/* Burn-rate alert */}
          {!analytics.loading && analytics.burnRateEurPerDay > 0 && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                (analytics.daysRemaining ?? 99) < 7
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : (analytics.daysRemaining ?? 99) < 14
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              <span className="text-base mt-0.5" aria-hidden>
                {(analytics.daysRemaining ?? 99) < 7 ? "🔴" : (analytics.daysRemaining ?? 99) < 14 ? "🟠" : "🟢"}
              </span>
              <div>
                <p className="font-semibold">
                  {analytics.daysRemaining !== null
                    ? `Solde estimé pour ${analytics.daysRemaining} jour${analytics.daysRemaining > 1 ? "s" : ""}`
                    : "Solde suffisant"}
                </p>
                <p className="text-xs opacity-80 mt-0.5">{analytics.topupReason}</p>
                <p className="text-xs opacity-50 mt-0.5">
                  Burn rate : ~{analytics.burnRateEurPerDay.toFixed(2)} €/jour (30 derniers jours)
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">{t("wallet.topup_card_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("wallet.topup_card_subtitle")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {(accountType === "individual"
              ? [
                  { v: 49, label: "49 € · Week-end" },
                  { v: 79, label: "79 € · Événement" },
                  { v: 149, label: "149 € · Lancement" },
                ]
              : [50, 100, 250, 500, 1000].map((v) => ({ v, label: `${v} €` }))
            ).map(({ v, label }) => {
              const isAiRec = analytics.recommendedTopupEur === v && analytics.recommendedTopupEur > 0;
              return (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`relative px-3 py-1.5 rounded-lg text-sm border transition ${
                    amount === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : isAiRec
                        ? "border-orange-500 text-orange-400 ring-1 ring-orange-500/50 hover:bg-orange-500/10"
                        : "border-border hover:bg-secondary"
                  }`}
                >
                  {label}
                  {isAiRec && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-1.5 py-px text-[9px] font-bold text-white whitespace-nowrap leading-tight">
                      IA
                    </span>
                  )}
                </button>
              );
            })}
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
              className="w-28 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          {showBankTransfer ? (
            <div className="space-y-4">
              <CinetPayTopupCheckout amountEuros={amount} />
              <BankTransferCheckout amountEur={amount} />
            </div>
          ) : (
            <WalletTopupCheckout
              amountEuros={amount}
              buttonLabel={t("wallet.topup_btn", { amount })}
            />
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold">{t("wallet.history_title")}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                disabled={txLoading || total === 0}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("wallet.export_csv_btn")}
              </button>
              <button
                onClick={exportPdfReport}
                disabled={txLoading || total === 0}
                title="Rapport de performance financier (PDF)"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📊 Rapport PDF
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TX_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => handleFilter(k)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  filterKind === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {t(`wallet.type.${k}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground text-sm animate-pulse">
              {t("common.loading")}
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground text-sm">
              {t("wallet.no_transactions")}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">{t("wallet.col_date")}</th>
                    <th className="text-left px-4 py-3">{t("wallet.col_type")}</th>
                    <th className="text-left px-4 py-3">{t("wallet.col_desc")}</th>
                    <th className="text-right px-4 py-3">{t("wallet.col_amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString(locale)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.kind === "topup"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : tx.kind === "campaign_debit"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                : tx.kind === "refund"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                  : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {t(`wallet.tx_label.${tx.kind}` as Parameters<typeof t>[0]) ?? tx.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.description ?? "—"}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold font-mono whitespace-nowrap ${tx.amount_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                      >
                        {tx.amount_cents >= 0 ? "+" : ""}
                        {fmt(fromEurCents(tx.amount_cents))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || txLoading}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("wallet.prev")}
              </button>
              <span className="text-muted-foreground">
                {t("wallet.page_info", { current: page + 1, total: totalPages, count: total })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || txLoading}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("wallet.next")}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
