import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CronStatus = "success" | "failed" | "retrying" | "exhausted" | "pending";

export interface CronLog {
  id: number;
  job_name: string;
  status: CronStatus;
  retry_count: number;
  max_retries: number;
  parent_log_id: number | null;
  result: {
    success: boolean;
    // expire-campaigns-nightly
    processed_campaigns_count?: number;
    generated_transfers_count?: number;
    // retry-failed-cron-jobs
    retried?: number;
    // check-stripe-onboarding-weekly
    notified?: number;
    errors?: number;
  } | null;
  executed_at: string;
}

export function useAdminCronLogs() {
  return useQuery({
    queryKey: ["admin-cron-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_cron_logs")
        .select("id, job_name, status, retry_count, max_retries, parent_log_id, result, executed_at")
        .order("executed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CronLog[];
    },
    refetchInterval: 60000,
  });
}
