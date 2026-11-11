import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCronLogs, type CronLog, type CronStatus } from "@/hooks/useAdminCronLogs";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: CronStatus }) {
  switch (status) {
    case "success":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> Succès
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" /> Échec
        </span>
      );
    case "retrying":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-500">
          <RotateCcw className="h-3.5 w-3.5 animate-spin" /> Relance…
        </span>
      );
    case "exhausted":
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-400 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> Épuisé
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> En attente
        </span>
      );
  }
}

function ResultDetail({ log }: { log: CronLog }) {
  if (!log.result) return <span className="text-muted-foreground">—</span>;

  if (log.job_name === "expire-campaigns-nightly") {
    if (!log.result.success) return <span className="text-destructive text-xs">Erreur</span>;
    return (
      <span className="text-xs text-muted-foreground">
        {log.result.processed_campaigns_count ?? 0} campagne(s) ·{" "}
        {log.result.generated_transfers_count ?? 0} virement(s)
      </span>
    );
  }

  if (log.job_name === "check-stripe-onboarding-weekly") {
    if (!log.result.success) return <span className="text-destructive text-xs">Erreur</span>;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Mail className="h-3 w-3" />
        {log.result.notified ?? 0} notifié(s)
        {(log.result.errors ?? 0) > 0 && (
          <span className="text-destructive"> · {log.result.errors} erreur(s)</span>
        )}
      </span>
    );
  }

  if (log.job_name === "retry-failed-cron-jobs") {
    return (
      <span className="text-xs text-muted-foreground">
        {log.result.retried ?? 0} relancé(s)
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
      {JSON.stringify(log.result).slice(0, 60)}
    </span>
  );
}

function RetryBadge({ log }: { log: CronLog }) {
  if (log.retry_count === 0 && !log.parent_log_id) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
      <RotateCcw className="h-2.5 w-2.5" />
      {log.retry_count}/{log.max_retries}
    </span>
  );
}

const JOB_LABELS: Record<string, string> = {
  "expire-campaigns-nightly":      "Clôture campagnes",
  "retry-failed-cron-jobs":        "Relance auto",
  "check-stripe-onboarding-weekly":"Rappels Stripe",
};

export function AdminCronJobPanel() {
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading, refetch, isFetching } = useAdminCronLogs();

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "process_expired_campaigns_payouts" as never
      );
      if (error) throw error;
      return data as {
        success: boolean;
        processed_campaigns_count: number;
        generated_transfers_count: number;
      };
    },
    onSuccess: (result) => {
      toast.success(
        `Clôture terminée — ${result.processed_campaigns_count} campagne(s), ${result.generated_transfers_count} virement(s)`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-cron-logs"] });
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const lastExpire = logs.find(
    (l) => l.job_name === "expire-campaigns-nightly" && l.parent_log_id === null
  );
  const lastStripe = logs.find((l) => l.job_name === "check-stripe-onboarding-weekly");
  const failedCount = logs.filter(
    (l) => l.status === "failed" && l.retry_count < l.max_retries
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Jobs planifiés (pg_cron)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clôture · Relances · Rappels Stripe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Clôture manuelle
          </Button>
        </div>
      </div>

      {/* Résumé jobs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Clôture campagnes */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Clôture campagnes
          </p>
          <p className="text-xs font-medium">Chaque nuit à 2h UTC</p>
          {lastExpire ? (
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={lastExpire.status} />
              <span className="text-[11px] text-muted-foreground">
                {formatDate(lastExpire.executed_at)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucune exécution</span>
          )}
        </div>

        {/* Relance auto */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Relance automatique
          </p>
          <p className="text-xs font-medium">Toutes les 30 min</p>
          {failedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {failedCount} job(s) en attente de relance
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Aucun échec en attente
            </span>
          )}
        </div>

        {/* Rappels Stripe */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Rappels Stripe Connect
          </p>
          <p className="text-xs font-medium">Lundi 8h UTC</p>
          {lastStripe ? (
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={lastStripe.status} />
              <ResultDetail log={lastStripe} />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucune exécution</span>
          )}
        </div>
      </div>

      {/* Tableau des logs */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium pr-4">Date</th>
              <th className="text-left pb-2 font-medium pr-4">Job</th>
              <th className="text-left pb-2 font-medium pr-4">Statut</th>
              <th className="text-left pb-2 font-medium">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Aucune exécution enregistrée
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr
                key={log.id}
                className={`border-b border-border/50 last:border-0 ${
                  log.parent_log_id ? "pl-4 opacity-80" : ""
                }`}
              >
                <td className="py-2 pr-4 tabular-nums whitespace-nowrap">
                  {log.parent_log_id && (
                    <span className="mr-1 text-muted-foreground">↳</span>
                  )}
                  {formatDate(log.executed_at)}
                </td>
                <td className="py-2 pr-4 font-mono text-muted-foreground">
                  {JOB_LABELS[log.job_name] ?? log.job_name}
                  <RetryBadge log={log} />
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={log.status} />
                </td>
                <td className="py-2">
                  <ResultDetail log={log} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
