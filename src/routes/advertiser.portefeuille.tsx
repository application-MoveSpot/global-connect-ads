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
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { RouteError } from "@/components/app/RouteError";
import { useCurrency } from "@/hooks/useCurrency";

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

const TX_KINDS: TxKind[] = ["all", "topup", "campaign_debit", "refund", "admin_adjustment"];

const PAGE_SIZE = 25;

function WalletPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { fmt, locale, fromEurCents } = useCurrency();
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTransactions = useServerFn(getWalletTransactions);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [balanceCents, setBalanceCents] = useState(0);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100);

  const [filterKind, setFilterKind] = useState<TxKind>("all");
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Declared before refs so the refs can capture this function
  const loadTransactions = useCallback(async (kind: TxKind, p: number) => {
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
  }, [fetchTransactions]);

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
      if (!session) { navigate({ to: "/advertiser/inscription" }); return; }
      setUserId(session.user.id);
      const [walletResult, profResult] = await Promise.allSettled([
        fetchWallet(),
        supabase.from("advertiser_profiles").select("account_type").eq("user_id", session.user.id).maybeSingle(),
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
        { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const tx = payload.new as { amount_cents: number; kind: string };
          setBalanceCents((prev) => prev + tx.amount_cents);
          if (tx.kind === "topup") toast.success(t("wallet.topup_success"));
          void loadTransactionsRef.current(filterKindRef.current, pageRef.current);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">{t("wallet.back_to_dashboard")}</Link>
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
            <Link to="/advertiser/pack" className="inline-block mt-1 text-xs text-primary hover:underline">
              {t("wallet.see_packs")}
            </Link>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("wallet.balance")}</div>
          <div className="font-display text-5xl font-bold mt-2">{fmt(fromEurCents(balanceCents))}</div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">{t("wallet.topup_card_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("wallet.topup_card_subtitle")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {(accountType === "individual"
              ? [{ v: 49, label: "49 € · Week-end" }, { v: 79, label: "79 € · Événement" }, { v: 149, label: "149 € · Lancement" }]
              : [50, 100, 250, 500, 1000].map((v) => ({ v, label: `${v} €` }))
            ).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${amount === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
              >
                {label}
              </button>
            ))}
            <input
              type="number"
              min={10}
              value={amount}
              onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
              className="w-28 px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <WalletTopupCheckout amountEuros={amount} buttonLabel={t("wallet.topup_btn", { amount })} />
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold">{t("wallet.history_title")}</h2>
            <button
              onClick={exportCsv}
              disabled={txLoading || total === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("wallet.export_csv_btn")}
            </button>
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
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          tx.kind === "topup" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                          tx.kind === "campaign_debit" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                          tx.kind === "refund" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {t(`wallet.tx_label.${tx.kind}` as Parameters<typeof t>[0]) ?? tx.kind}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.description ?? "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold font-mono whitespace-nowrap ${tx.amount_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {tx.amount_cents >= 0 ? "+" : ""}{fmt(fromEurCents(tx.amount_cents))}
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
