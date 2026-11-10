import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CronLog {
  id: number;
  job_name: string;
  result: {
    success: boolean;
    processed_campaigns_count: number;
    generated_transfers_count: number;
  } | null;
  executed_at: string;
}

export function useAdminCronLogs() {
  return useQuery({
    queryKey: ["admin-cron-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_cron_logs")
        .select("id, job_name, result, executed_at")
        .order("executed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CronLog[];
    },
    refetchInterval: 60000,
  });
}
