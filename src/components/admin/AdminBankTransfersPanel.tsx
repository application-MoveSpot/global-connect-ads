import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminBankTransfers,
  type BankTransferStatus,
  type AdminBankTransferRow,
} from "@/hooks/useAdminBankTransfers";

const STATUS_FILTERS: { value: BankTransferStatus; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "processing", label: "En cours" },
  { value: "completed", label: "Complétés" },
  { value: "failed", label: "Échoués" },
];

const STATUS_STYLES: Record<string, { icon: React.ReactNode; cls: string }> = {
  pending:    { icon: <Clock className="h-3.5 w-3.5" />, cls: "text-muted-foreground" },
  processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, cls: "text-blue-600 dark:text-blue-400" },
  completed:  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "text-emerald-600 dark:text-emerald-400" },
  failed:     { icon: <XCircle className="h-3.5 w-3.5" />, cls: "text-destructive" },
  submitted:  { icon: <Clock className="h-3.5 w-3.5" />, cls: "text-muted-foreground" },
  approved:   { icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: "text-emerald-600 dark:text-emerald-400" },
  rejected:   { icon: <XCircle className="h-3.5 w-3.5" />, cls: "text-destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.cls}`}>
      {s.icon}
      {status}
    </span>
  );
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function short(s: string | null | undefined, n = 12) {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function TransferRow({
  row,
  onRetry,
  retrying,
}: {
  row: AdminBankTransferRow;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer"
        onClick={() => setExpanded((x) => !x)}
      >
        <td className="py-2 pr-3 tabular-nums text-xs">{formatDate(row.created_at)}</td>
        <td className="py-2 pr-3 text-xs font-semibold tabular-nums">{fmt(row.amount_cents)}</td>
        <td className="py-2 pr-3 text-xs font-mono text-muted-foreground">{short(row.user_id, 8)}</td>
        <td className="py-2 pr-3 text-xs font-mono text-muted-foreground">{short(row.stripe_account_id, 14)}</td>
        <td className="py-2 pr-3">
          <StatusBadge status={row.status} />
        </td>
        <td className="py-2 text-right">
          {row.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs gap-1"
              disabled={retrying}
              onClick={(e) => {
                e.stopPropagation();
                onRetry(row.id);
              }}
            >
              {retrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Relancer
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/50 bg-muted/20">
          <td colSpan={6} className="pb-3 pt-1 px-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <dt className="text-muted-foreground">Référence</dt>
                <dd className="font-mono break-all">{row.reference}</dd>
              </div>
              {row.stripe_transfer_id && (
                <div>
                  <dt className="text-muted-foreground">Stripe Transfer ID</dt>
                  <dd className="font-mono">{row.stripe_transfer_id}</dd>
                </div>
              )}
              {row.failure_reason && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" /> Raison d'échec
                  </dt>
                  <dd className="text-destructive break-all">{row.failure_reason}</dd>
                </div>
              )}
              {row.admin_notes && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Notes admin</dt>
                  <dd>{row.admin_notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">User ID</dt>
                <dd className="font-mono text-xs">{row.user_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stripe Account</dt>
                <dd className="font-mono text-xs">{row.stripe_account_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mis à jour</dt>
                <dd>{formatDate(row.updated_at)}</dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

export function AdminBankTransfersPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<BankTransferStatus>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: rows = [], isLoading, refetch, isFetching } = useAdminBankTransfers(filter);

  const retryMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("retry_bank_transfer", {
        request_id: requestId,
      });
      if (error) throw error;
      return data;
    },
    onMutate: (id) => setRetryingId(id),
    onSuccess: () => {
      toast.success("Virement relancé — traitement déclenché immédiatement");
      queryClient.invalidateQueries({ queryKey: ["admin-bank-transfers"] });
    },
    onError: (err: Error) => {
      toast.error(`Erreur relance : ${err.message}`);
    },
    onSettled: () => setRetryingId(null),
  });

  const failedCount = rows.filter((r) => r.status === "failed").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Virements Stripe Connect</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatique chaque nuit à 2h15 UTC · <code className="font-mono">process-bank-transfers</code>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Résumé badges */}
      {(failedCount > 0 || pendingCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {failedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive font-medium">
              <XCircle className="h-3.5 w-3.5" />
              {failedCount} en échec
            </span>
          )}
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium">
              <Clock className="h-3.5 w-3.5" />
              {pendingCount} en attente
            </span>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium pr-3">Date</th>
              <th className="text-left pb-2 font-medium pr-3">Montant</th>
              <th className="text-left pb-2 font-medium pr-3">User</th>
              <th className="text-left pb-2 font-medium pr-3">Compte Stripe</th>
              <th className="text-left pb-2 font-medium pr-3">Statut</th>
              <th className="text-right pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  Aucun virement{filter !== "all" ? ` (filtre : ${filter})` : ""}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <TransferRow
                key={row.id}
                row={row}
                onRetry={(id) => retryMutation.mutate(id)}
                retrying={retryingId === row.id && retryMutation.isPending}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Cliquez sur une ligne pour voir les détails · Les lignes en échec peuvent être relancées manuellement.
      </p>
    </div>
  );
}
