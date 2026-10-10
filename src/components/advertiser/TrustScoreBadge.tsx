import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldAlert, ShieldOff, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDriverTrustScore } from "@/lib/tracking/control-photo";

type TrustScore = {
  score: number;
  control_requests_total: number;
  control_requests_ok: number;
  control_requests_expired: number;
  control_requests_rejected: number;
  gps_anomaly_flags: number;
  zone_compliance_pct: number | null;
  last_updated_at: string | null;
};

type Props = {
  driverId: string;
  compact?: boolean;
};

function scoreLabel(score: number) {
  if (score >= 90) return { label: "Excellent", color: "green" } as const;
  if (score >= 70) return { label: "Bon", color: "blue" } as const;
  if (score >= 50) return { label: "Moyen", color: "amber" } as const;
  return { label: "Faible", color: "red" } as const;
}

const colorClasses = {
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    text: "text-green-700 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-300 dark:border-red-700",
    text: "text-red-700 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
  },
} as const;

function ScoreIcon({ score, className }: { score: number; className?: string }) {
  if (score >= 70) return <ShieldCheck className={cn("w-4 h-4", className)} />;
  if (score >= 50) return <ShieldAlert className={cn("w-4 h-4", className)} />;
  return <ShieldOff className={cn("w-4 h-4", className)} />;
}

export function TrustScoreBadge({ driverId, compact = false }: Props) {
  const [trustData, setTrustData] = useState<TrustScore | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fetchScore = useServerFn(getDriverTrustScore);

  useEffect(() => {
    fetchScore({ data: { driverId } })
      .then((res: { score: unknown }) => setTrustData(res.score as TrustScore))
      .catch(() => void 0);
  }, [driverId, fetchScore]);

  if (!trustData) {
    return (
      <span className="inline-block w-20 h-6 rounded-full bg-muted animate-pulse" />
    );
  }

  const { label, color } = scoreLabel(trustData.score);
  const cls = colorClasses[color];
  const hasControls = trustData.control_requests_total > 0;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 border",
          cls.bg,
          cls.border,
          cls.text,
        )}
        title={`Score de confiance : ${trustData.score}/100`}
      >
        <ScoreIcon score={trustData.score} className={cls.icon} />
        {trustData.score}/100
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-3",
        cls.bg,
        cls.border,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScoreIcon score={trustData.score} className={cn("w-5 h-5", cls.icon)} />
          <span className={cn("font-semibold text-sm", cls.text)}>
            Fiabilité chauffeur — {label}
          </span>
        </div>
        <span
          className={cn(
            "font-bold text-2xl tabular-nums leading-none",
            cls.text,
          )}
        >
          {trustData.score}
          <span className="text-sm font-normal opacity-60">/100</span>
        </span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color === "green" ? "bg-green-500" :
            color === "blue"  ? "bg-blue-500" :
            color === "amber" ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${trustData.score}%` }}
        />
      </div>

      {!hasControls && (
        <p className="text-xs opacity-60 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          Aucun contrôle effectué pour l'instant — score basé sur le comportement GPS.
        </p>
      )}

      {hasControls && (
        <>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className={cn("text-xs underline text-left opacity-60 hover:opacity-100", cls.text)}
          >
            {showDetails ? "Masquer les détails" : "Voir les détails"}
          </button>

          {showDetails && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="opacity-60">Contrôles réalisés</dt>
              <dd className="font-medium tabular-nums text-right">
                {trustData.control_requests_total}
              </dd>
              <dt className="opacity-60">Validés</dt>
              <dd className="font-medium tabular-nums text-right text-green-600 dark:text-green-400">
                {trustData.control_requests_ok}
              </dd>
              <dt className="opacity-60">Expirés (non-réponse)</dt>
              <dd className="font-medium tabular-nums text-right text-amber-600 dark:text-amber-400">
                {trustData.control_requests_expired}
              </dd>
              <dt className="opacity-60">Rejetés</dt>
              <dd className="font-medium tabular-nums text-right text-red-600 dark:text-red-400">
                {trustData.control_requests_rejected}
              </dd>
              {trustData.zone_compliance_pct != null && (
                <>
                  <dt className="opacity-60">Conformité zone GPS</dt>
                  <dd className="font-medium tabular-nums text-right">
                    {Math.round(trustData.zone_compliance_pct * 100)}%
                  </dd>
                </>
              )}
              {trustData.gps_anomaly_flags > 0 && (
                <>
                  <dt className="opacity-60 text-red-600 dark:text-red-400">
                    Anomalies GPS détectées
                  </dt>
                  <dd className="font-medium tabular-nums text-right text-red-600 dark:text-red-400">
                    {trustData.gps_anomaly_flags}
                  </dd>
                </>
              )}
            </dl>
          )}
        </>
      )}
    </div>
  );
}
