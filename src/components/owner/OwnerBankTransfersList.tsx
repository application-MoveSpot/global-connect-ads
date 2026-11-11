import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOwnerBankTransfers, type OwnerBankTransferRow } from "@/hooks/useOwnerBankTransfers";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

const STATUS_STYLES: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  pending:    { icon: <Clock className="h-3.5 w-3.5" />,                              label: "En attente",  cls: "text-muted-foreground bg-muted" },
  processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,               label: "En cours",    cls: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40" },
  completed:  { icon: <CheckCircle2 className="h-3.5 w-3.5" />,                       label: "Viré",        cls: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40" },
  failed:     { icon: <XCircle className="h-3.5 w-3.5" />,                            label: "Échoué",      cls: "text-destructive bg-destructive/10" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function ReceiptModal({ row, onClose }: { row: OwnerBankTransferRow; onClose: () => void }) {
  const printReceipt = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!doctype html><html><head>
        <meta charset="utf-8"/>
        <title>Reçu virement MoveSpot — ${row.reference}</title>
        <style>
          body { font-family: sans-serif; max-width: 600px; margin: 40px auto; color: #333; }
          h1 { color: #10b981; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; }
          td:last-child { text-align: right; font-weight: 600; }
          .amount { font-size: 28px; color: #059669; }
          footer { font-size: 11px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; }
        </style>
      </head><body>
        <h1>✅ Reçu de virement</h1>
        <p>MoveSpot SAS — virements@move-spot.com</p>
        <table>
          <tr><td>Montant</td><td class="amount">${fmt(row.amount_cents)}</td></tr>
          <tr><td>Statut</td><td>${STATUS_STYLES[row.status]?.label ?? row.status}</td></tr>
          <tr><td>Référence</td><td><code>${row.reference}</code></td></tr>
          ${row.stripe_transfer_id ? `<tr><td>ID Stripe Transfer</td><td><code>${row.stripe_transfer_id}</code></td></tr>` : ""}
          <tr><td>Date de création</td><td>${formatDate(row.created_at)}</td></tr>
          <tr><td>Dernière mise à jour</td><td>${formatDate(row.updated_at)}</td></tr>
        </table>
        <footer>
          Ce reçu est généré automatiquement par la plateforme MoveSpot.<br/>
          Réf. interne : ${row.id}
        </footer>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold">Reçu de virement</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center">
          <p className="text-3xl font-bold font-display text-emerald-600">{fmt(row.amount_cents)}</p>
          <div className="mt-2">
            <StatusBadge status={row.status} />
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Référence</dt>
            <dd className="font-mono text-xs">{row.reference}</dd>
          </div>
          {row.stripe_transfer_id && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Stripe Transfer</dt>
              <dd className="font-mono text-xs">{row.stripe_transfer_id}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Mis à jour</dt>
            <dd>{formatDate(row.updated_at)}</dd>
          </div>
          {row.failure_reason && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{row.failure_reason}</span>
            </div>
          )}
        </dl>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={printReceipt}
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimer / Sauvegarder en PDF
        </Button>
      </div>
    </div>
  );
}

export function OwnerBankTransfersList() {
  const { data: transfers = [], isLoading } = useOwnerBankTransfers();
  const [selected, setSelected] = useState<OwnerBankTransferRow | null>(null);

  const totalCompleted = transfers
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.amount_cents, 0);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Chargement des virements…
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-1">
        <p className="text-sm font-medium">Aucun virement bancaire</p>
        <p className="text-xs text-muted-foreground">
          Les virements apparaissent ici une fois vos gains reversés chaque nuit.
        </p>
      </div>
    );
  }

  return (
    <>
      {selected && (
        <ReceiptModal row={selected} onClose={() => setSelected(null)} />
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm">Virements bancaires</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatique chaque nuit via Stripe Connect
            </p>
          </div>
          {totalCompleted > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Total reçu</p>
              <p className="font-semibold text-emerald-600">{fmt(totalCompleted)}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {transfers.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-border hover:bg-muted/40 transition-colors p-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{t.reference}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={t.status} />
                <span className="font-semibold tabular-nums">{fmt(t.amount_cents)}</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Cliquez sur un virement pour voir le reçu imprimable
        </p>
      </div>
    </>
  );
}
