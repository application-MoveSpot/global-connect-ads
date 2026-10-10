import { useMemo } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  estimatePoseFee,
  inferFormatKey,
  ZONE_LABELS,
  FORMAT_LABELS,
} from "@/lib/providers/pose-fee-estimate";

type Props = {
  vehicleType: string;
  surfaceM2?: number | null;
  formatPublicitaire?: string | null;
  location?: string | null;
  /** fee already stored in campaign_request (in cents) */
  storedPoseFeeCents?: number | null;
  storedDeposeFeeCents?: number | null;
  operation?: "pose" | "depose" | "both";
  className?: string;
};

const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function PoseFeeEstimateCard({
  vehicleType,
  surfaceM2,
  formatPublicitaire,
  location,
  storedPoseFeeCents,
  storedDeposeFeeCents,
  operation = "both",
  className,
}: Props) {
  const estimate = useMemo(() => {
    const formatKey = inferFormatKey(surfaceM2 ?? null, formatPublicitaire ?? null);
    return estimatePoseFee({ formatKey, vehicleType, location: location ?? "" });
  }, [vehicleType, surfaceM2, formatPublicitaire, location]);

  const showPose   = operation === "pose"   || operation === "both";
  const showDepose = operation === "depose" || operation === "both";

  return (
    <div className={cn("rounded-lg border bg-muted/40 p-4 text-sm space-y-3", className)}>
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <Info className="h-4 w-4 shrink-0" />
        <span>Estimation tarifaire MoveSpot</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Format</span>
        <span>{FORMAT_LABELS[estimate.format]}</span>
        <span className="font-medium text-foreground">Zone</span>
        <span>{ZONE_LABELS[estimate.zone]}</span>
      </div>

      <div className="flex flex-col gap-2">
        {showPose && (
          <FeeRow
            label="Pose"
            min={estimate.poseMin}
            max={estimate.poseMax}
            storedCents={storedPoseFeeCents}
          />
        )}
        {showDepose && (
          <FeeRow
            label="Dépose"
            min={estimate.deposeMin}
            max={estimate.deposeMax}
            storedCents={storedDeposeFeeCents}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        Fourchette indicative calculée selon le format du véhicule et la zone géographique.
        Le montant final est fixé d'un commun accord avec l'annonceur.
      </p>
    </div>
  );
}

function FeeRow({
  label,
  min,
  max,
  storedCents,
}: {
  label: string;
  min: number;
  max: number;
  storedCents?: number | null;
}) {
  const stored = storedCents != null ? Math.round(storedCents / 100) : null;
  const inRange = stored != null && stored >= Math.round(min * 0.70) && stored <= Math.round(max * 1.30);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {eur(min)} – {eur(max)}
        </span>
        {stored != null && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-semibold",
              inRange
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            )}
          >
            {eur(stored)} {inRange ? "✓" : "!"}
          </span>
        )}
      </div>
    </div>
  );
}
