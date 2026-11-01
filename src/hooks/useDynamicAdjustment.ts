import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AlertType = "conflict" | "opportunity" | "extension" | "overlap";
export type AlertPriority = "high" | "medium" | "low";

export interface AdjustmentAction {
  label: string;
  new_start_date: string | null;
  new_end_date: string | null;
  extend_days: number | null;
}

export interface CalendarAlert {
  brief_id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  action: AdjustmentAction;
}

export const ALERT_STYLES: Record<AlertType, { icon: string; className: string }> = {
  conflict:    { icon: "⚠️", className: "border-red-400 bg-red-50 dark:bg-red-950/30" },
  opportunity: { icon: "✨", className: "border-green-400 bg-green-50 dark:bg-green-950/30" },
  extension:   { icon: "📅", className: "border-blue-400 bg-blue-50 dark:bg-blue-950/30" },
  overlap:     { icon: "🔄", className: "border-amber-400 bg-amber-50 dark:bg-amber-950/30" },
};

export const PRIORITY_BADGE: Record<AlertPriority, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-slate-100 text-slate-600",
};

export interface CalendarCampaignInput {
  brief_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  sector: string;
  city: string;
  budget: number;
  vehicle_types: string[];
}

export function useDynamicAdjustment(campaigns: CalendarCampaignInput[]) {
  const [alerts, setAlerts] = useState<CalendarAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const analyze = useCallback(async () => {
    if (campaigns.length === 0) {
      setAlerts([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-campaign-adjustment",
        {
          body: {
            campaigns,
            analysis_date: new Date().toISOString().slice(0, 10),
          },
        },
      );
      if (fnError) throw fnError;
      const result = data as { alerts: CalendarAlert[] };
      setAlerts(result.alerts ?? []);
    } catch {
      // Silent fail — adjustment suggestions are non-critical
    } finally {
      setLoading(false);
    }
  }, [campaigns]);

  // Auto-analyze when campaign list changes (800ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => void analyze(), 800);
    return () => clearTimeout(timer);
  }, [campaigns.length, analyze]);

  // Apply a suggested adjustment directly to Supabase
  const applyAction = useCallback(
    async (alert: CalendarAlert): Promise<boolean> => {
      const patch: Record<string, unknown> = {};

      if (alert.action.new_start_date) patch.start_date = alert.action.new_start_date;
      if (alert.action.new_end_date) patch.end_date = alert.action.new_end_date;

      if (alert.action.extend_days) {
        const campaign = campaigns.find((c) => c.brief_id === alert.brief_id);
        if (campaign) {
          const extended = new Date(campaign.end_date);
          extended.setDate(extended.getDate() + alert.action.extend_days);
          patch.end_date = extended.toISOString().slice(0, 10);
        }
      }

      if (Object.keys(patch).length === 0) return false;

      const { error } = await supabase
        .from("advertiser_briefs")
        .update(patch)
        .eq("id", alert.brief_id);

      if (!error) {
        dismiss(alert.brief_id);
        return true;
      }
      return false;
    },
    [campaigns],
  );

  const dismiss = useCallback((briefId: string) => {
    setDismissed((prev) => new Set(prev).add(briefId));
  }, []);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.brief_id));
  const highPriorityCount = visibleAlerts.filter((a) => a.priority === "high").length;

  return {
    alerts: visibleAlerts,
    allAlerts: alerts,
    highPriorityCount,
    loading,
    analyze,
    applyAction,
    dismiss,
  };
}
