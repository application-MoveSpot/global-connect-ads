import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

export type StatusHistoryEntityType =
  | "campaign_status"
  | "campaign_installation"
  | "campaign_depose"
  | "payee_certification"
  | "provider_status";

type Entry = {
  id: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  created_at: string;
};

type Props = {
  entityType: StatusHistoryEntityType;
  entityId: string;
  statusLabel?: Record<string, string>;
  triggerLabel?: string;
};

export function StatusHistory({ entityType, entityId, statusLabel, triggerLabel }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const label = (s: string | null) => (s ? (statusLabel?.[s] ?? s) : "—");

  const fmt = (d: string) => new Date(d).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && entries === null) {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("status_history")
        .select("id, previous_status, new_status, reason, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      setEntries((data ?? []) as Entry[]);
      setLoading(false);
    }
  };

  return (
    <div className="text-xs">
      <button type="button" onClick={toggle} className="text-primary hover:underline font-medium">
        {open ? t("status_history.btn_hide") : (triggerLabel ?? t("status_history.btn_show"))}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-muted-foreground">{t("status_history.empty")}</p>
          ) : (
            entries.map((e) => (
              <div key={e.id}>
                <p className="text-foreground">
                  {label(e.previous_status)} → <strong>{label(e.new_status)}</strong>
                  <span className="text-muted-foreground"> · {fmt(e.created_at)}</span>
                </p>
                {e.reason ? <p className="text-muted-foreground">{e.reason}</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
