import { Sparkles } from "lucide-react";
import type { BriefSummary } from "@/hooks/useAiBriefSummaries";

interface AiBriefSummaryBadgeProps {
  briefId: string;
  summary: BriefSummary | undefined;
  loading: boolean;
}

/**
 * Inline badge displayed in each brief row.
 * Shows a skeleton while loading, an amber "action required" pill, or a neutral summary pill.
 */
export function AiBriefSummaryBadge({ summary, loading }: AiBriefSummaryBadgeProps) {
  if (loading && !summary) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Sparkles className="h-3 w-3" />
        <span className="w-28 h-3 rounded bg-muted" />
      </span>
    );
  }

  if (!summary) return null;

  const cls = summary.action_required
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
    : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${cls} max-w-[260px] truncate`}
      title={summary.summary_text}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      <span className="truncate">{summary.summary_text}</span>
    </span>
  );
}
