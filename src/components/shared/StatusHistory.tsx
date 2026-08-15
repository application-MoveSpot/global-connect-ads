import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatusHistoryEntityType =
  | "campaign_status"
  | "campaign_installation"
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
  /** Libellés lisibles pour les valeurs de statut brutes (sinon affichées telles quelles). */
  statusLabel?: Record<string, string>;
  triggerLabel?: string;
};

const fr = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function StatusHistory({ entityType, entityId, statusLabel, triggerLabel = "Historique" }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const label = (s: string | null) => (s ? (statusLabel?.[s] ?? s) : "—");

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && entries === null) {
      setLoading(true);
      const { data } = await supabase
        .from("status_history")
        .select("id, previous_status, new_status, reason, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      setEntries(data ?? []);
      setLoading(false);
    }
  };

  return (
    <div className="text-xs">
      <button type="button" onClick={toggle} className="text-primary hover:underline font-medium">
        {open ? "Masquer l'historique" : triggerLabel}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-muted-foreground">Aucun changement de statut enregistré pour l'instant.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id}>
                <p className="text-foreground">
                  {label(e.previous_status)} → <strong>{label(e.new_status)}</strong>
                  <span className="text-muted-foreground"> · {fr(e.created_at)}</span>
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
