import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { reportObstacleWithToken, OBSTACLE_TYPES, type ObstacleType } from "@/lib/tracking/obstacle.functions";

interface Props {
  token: string;
}

export function ObstacleReportDialog({ token }: Props) {
  const [open, setOpen] = useState(false);
  const [obstacleType, setObstacleType] = useState<ObstacleType>("travaux");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const report = useServerFn(reportObstacleWithToken);

  const submit = async () => {
    setSending(true);
    try {
      await report({
        data: {
          token,
          obstacleType,
          description: description.trim() || undefined,
          reportedAt: new Date().toISOString(),
        },
      });
      toast.success("Signalement envoyé à MoveSpot");
      setOpen(false);
      setDescription("");
      setObstacleType("travaux");
    } catch {
      toast.error("Échec du signalement — réessayez");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 py-3 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
      >
        ⚠️ Signaler un obstacle
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">Signaler un obstacle</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Annuler
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Type d'obstacle
        </label>
        <div className="grid grid-cols-2 gap-2">
          {OBSTACLE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setObstacleType(t.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium text-left transition-colors ${
                obstacleType === t.value
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "border-border bg-card text-muted-foreground hover:border-amber-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Description <span className="normal-case">(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : cortège bloquant l'avenue principale, chantier rue Victor Hugo…"
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
      </div>

      <p className="text-xs text-muted-foreground">
        MoveSpot recevra ce signalement horodaté. Si l'événement est avéré, les métriques de la période
        pourront être neutralisées pour votre rémunération.
      </p>

      <button
        onClick={submit}
        disabled={sending}
        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 text-sm font-semibold transition-colors"
      >
        {sending ? "Envoi…" : "Envoyer le signalement"}
      </button>
    </div>
  );
}
