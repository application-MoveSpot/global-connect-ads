import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCronLogs, type CronLog } from "@/hooks/useAdminCronLogs";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function ResultBadge({ log }: { log: CronLog }) {
  if (!log.result) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> —
      </span>
    );
  }
  if (!log.result.success) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Échec
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {log.result.processed_campaigns_count} campagne(s) · {log.result.generated_transfers_count} virement(s)
    </span>
  );
}

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
        `Clôture terminée — ${result.processed_campaigns_count} campagne(s), ${result.generated_transfers_count} virement(s) générés`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-cron-logs"] });
    },
    onError: (err: Error) => {
      toast.error(`Erreur : ${err.message}`);
    },
  });

  const lastLog = logs[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm">Clôture des campagnes expirées</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatique chaque nuit à 2h00 UTC · pg_cron
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
            Déclencher manuellement
          </Button>
        </div>
      </div>

      {lastLog && (
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm flex items-center justify-between gap-2 flex-wrap">
          <span className="text-muted-foreground text-xs">Dernière exécution</span>
          <span className="text-xs">{formatDate(lastLog.executed_at)}</span>
          <ResultBadge log={lastLog} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium pr-4">Date</th>
              <th className="text-left pb-2 font-medium pr-4">Job</th>
              <th className="text-left pb-2 font-medium pr-4">Campagnes</th>
              <th className="text-left pb-2 font-medium">Virements</th>
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
              <tr key={log.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 tabular-nums">{formatDate(log.executed_at)}</td>
                <td className="py-2 pr-4 font-mono text-muted-foreground">{log.job_name}</td>
                <td className="py-2 pr-4">
                  {log.result?.processed_campaigns_count ?? "—"}
                </td>
                <td className="py-2">
                  {log.result?.generated_transfers_count ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
