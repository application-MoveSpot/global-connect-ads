import { useState } from "react";
import { Receipt, TrendingUp, TrendingDown, Loader2, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useWalletTransactions,
  type WalletTransaction,
  type WalletTransactionKind,
} from "@/hooks/useWalletTransactions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(eur: number) {
  const sign = eur >= 0 ? "+" : "";
  return `${sign}${eur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// ─── Badge type de mouvement ─────────────────────────────────────────────────

const KIND_META: Record<
  string,
  { label: string; color: string }
> = {
  topup:            { label: "Rechargement",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  campaign_payment: { label: "Paiement camp.", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  refund:           { label: "Remboursement",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  credit:           { label: "Crédit",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  debit:            { label: "Débit",          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function KindBadge({ kind }: { kind: WalletTransactionKind }) {
  const meta = KIND_META[kind] ?? {
    label: kind,
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}

// ─── Modal reçu ──────────────────────────────────────────────────────────────

function ReceiptModal({
  tx,
  onClose,
}: {
  tx: WalletTransaction;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-1 pb-2 border-b border-border">
          <Receipt className="h-8 w-8 text-primary mb-1" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Reçu de transaction</p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              tx.amount_eur >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {formatAmount(tx.amount_eur)}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDate(tx.created_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd><KindBadge kind={tx.kind} /></dd>
          </div>
          {tx.description && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground shrink-0">Description</dt>
              <dd className="text-right">{tx.description}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Référence</dt>
            <dd className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
              {tx.id}
            </dd>
          </div>
          {tx.stripe_payment_intent_id && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Stripe PI</dt>
              <dd className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                {tx.stripe_payment_intent_id}
              </dd>
            </div>
          )}
        </dl>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.print()}
        >
          Imprimer / Sauvegarder en PDF
        </Button>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function WalletTransactionsList() {
  const { data: transactions = [], isLoading, isError } = useWalletTransactions();
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement de l'historique…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Impossible de charger l'historique des transactions.
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Inbox className="h-10 w-10 opacity-30" />
        <p className="text-sm">Aucune transaction pour le moment.</p>
      </div>
    );
  }

  return (
    <>
      {selected && (
        <ReceiptModal tx={selected} onClose={() => setSelected(null)} />
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-right px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((tx) => {
              const isPositive = tx.amount_eur >= 0;
              return (
                <tr
                  key={tx.id}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="truncate block">
                      {tx.description ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <KindBadge kind={tx.kind} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isPositive
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {formatAmount(tx.amount_eur)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelected(tx)}
                    >
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Reçu
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
