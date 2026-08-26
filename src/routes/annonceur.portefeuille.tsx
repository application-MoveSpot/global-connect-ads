import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { getMyWallet, getWalletTransactions } from "@/lib/payments/wallet.functions";
import { WalletTopupCheckout } from "@/components/advertiser/WalletTopupCheckout";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import { BankTransferPanel } from "@/components/advertiser/BankTransferPanel";

export const Route = createFileRoute("/annonceur/portefeuille")({
  head: () => ({
    meta: [
      { title: "Mon portefeuille — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WalletPage,
});

type TxKind = "all" | "topup" | "campaign_debit" | "refund" | "admin_adjustment";

const KIND_LABELS: Record<TxKind, string> = {
  all: "Tout",
  topup: "Recharges",
  campaign_debit: "Campagnes",
  refund: "Remboursements",
  admin_adjustment: "Ajustements",
};

const PAGE_SIZE = 25;

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function labelKind(k: string) {
  switch (k) {
    case "topup": return "Recharge";
    case "campaign_debit": return "Campagne";
    case "refund": return "Remboursement";
    case "admin_adjustment": return "Ajustement";
    default: return k;
  }
}

function WalletPage() {
  const navigate = useNavigate();
  const fetchWallet = useServerFn(getMyWallet);
  const fetchTransactions = useServerFn(getWalletTransactions);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [balanceCents, setBalanceCents] = useState(0);
  const [amount, setAmount] = useState<number>(100);

  const [filterKind, setFilterKind] = useState<TxKind>("all");
  const [page, setPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Load balance once
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      try {
        const w = await fetchWallet();
        setBalanceCents(w.balance_cents);
      } catch { /* ignore */ }
      setAuthReady(true);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload transactions when filter or page changes
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
      const header = ["Date", "Type", "Description", "Montant (EUR)"];
      const rows = r.transactions.map((t: any) => [
        new Date(t.created_at).toLocaleString("fr-FR"),
        labelKind(t.kind),
        t.description ?? "",
        (t.amount_cents / 100).toFixed(2).replace(".", ","),
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h1 className="font-display text-3xl font-bold mb-2">Mon portefeuille</h1>
          <p className="text-sm text-muted-foreground">Crédits prépayés utilisables instantanément pour vos campagnes.</p>
        </section>

        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Solde disponible</div>
          <div className="font-display text-5xl font-bold mt-2">{fmt(balanceCents)}</div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Recharger par carte bancaire</h2>
          <p className="text-sm text-muted-foreground">Paiement sécurisé via Stripe. Le solde est crédité instantanément.</p>
          <div className="flex flex-wrap items-center gap-2">
            {[50, 100, 250, 500, 1000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${amount === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
              >
                {v} €
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
          <WalletTopupCheckout amountEuros={amount} buttonLabel={`Recharger ${amount} €`} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <BankTransferPanel />
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold">Historique du portefeuille</h2>
            <button
              onClick={exportCsv}
              disabled={txLoading || total === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↓ Exporter CSV
            </button>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(KIND_LABELS) as TxKind[]).map((k) => (
              <button
                key={k}
                onClick={() => handleFilter(k)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  filterKind === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground text-sm animate-pulse">
              Chargement…
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground text-sm">
              Aucun mouvement pour ce filtre.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.kind === "topup" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                          t.kind === "campaign_debit" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                          t.kind === "refund" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                          "bg-secondary text-muted-foreground"
                        }`}>
                          {labelKind(t.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.description ?? "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold font-mono whitespace-nowrap ${t.amount_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {t.amount_cents >= 0 ? "+" : ""}{fmt(t.amount_cents)}
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
                ← Précédent
              </button>
              <span className="text-muted-foreground">
                Page {page + 1} / {totalPages} · {total} transaction{total > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || txLoading}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
