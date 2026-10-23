import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isCoveringQuad,
  parseCoveringZone,
  type CoveringQuad,
  type CoveringZone,
} from "@/lib/fleet/covering-geometry";
import type { Json } from "@/integrations/supabase/types";
export type { CoveringPoint, CoveringQuad, CoveringZone } from "@/lib/fleet/covering-geometry";

export function useCoveringZone(vehicleId: string) {
  const [zone, setZone] = useState<CoveringZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setZone(null);
    setError(null);
    let cancelled = false;
    supabase
      .from("vehicles")
      .select("covering_zone")
      .eq("id", vehicleId)
      .single()
      .then(({ data, error: readError }) => {
        if (cancelled) return;
        setZone(parseCoveringZone(data?.covering_zone));
        setError(readError ? "Impossible de charger la zone publicitaire." : null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const saveZone = useCallback(
    async (photoIndex: number, points: CoveringQuad, photoPath?: string) => {
      if (!isCoveringQuad(points)) {
        setError("Les quatre coins doivent former une zone sans croisement.");
        return false;
      }
      setSaving(true);
      setError(null);
      const updated: CoveringZone = {
        ...(zone ?? {}),
        [photoIndex]: { points, ...(photoPath ? { photoPath } : {}) },
      };
      const { data, error: writeError } = await supabase
        .from("vehicles")
        .update({ covering_zone: updated as unknown as Json })
        .eq("id", vehicleId)
        .select("covering_zone")
        .single();
      setSaving(false);
      if (writeError) {
        setError("La zone n’a pas été enregistrée. Réessayez.");
        return false;
      }
      setZone(parseCoveringZone(data.covering_zone));
      return true;
    },
    [vehicleId, zone],
  );

  const clearZone = useCallback(
    async (photoIndex: number) => {
      setSaving(true);
      setError(null);
      const updated = { ...(zone ?? {}) };
      delete updated[photoIndex];
      const newZone = Object.keys(updated).length ? updated : null;
      const { data, error: writeError } = await supabase
        .from("vehicles")
        .update({ covering_zone: newZone as unknown as Json })
        .eq("id", vehicleId)
        .select("covering_zone")
        .single();
      setSaving(false);
      if (writeError) {
        setError("La zone n’a pas été effacée. Réessayez.");
        return false;
      }
      setZone(parseCoveringZone(data.covering_zone));
      return true;
    },
    [vehicleId, zone],
  );

  return { zone, loading, saving, error, saveZone, clearZone };
}
