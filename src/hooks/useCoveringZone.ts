import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CoveringPoint = { x: number; y: number };
export type CoveringQuad = [CoveringPoint, CoveringPoint, CoveringPoint, CoveringPoint];
export type CoveringZone = Record<number, { points: CoveringQuad }>;

export function useCoveringZone(vehicleId: string) {
  const [zone, setZone] = useState<CoveringZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("vehicles")
      .select("covering_zone")
      .eq("id", vehicleId)
      .single()
      .then(({ data }) => {
        setZone((data?.covering_zone as CoveringZone) ?? null);
        setLoading(false);
      });
  }, [vehicleId]);

  const saveZone = useCallback(
    async (photoIndex: number, points: CoveringQuad) => {
      setSaving(true);
      const updated: CoveringZone = { ...(zone ?? {}), [photoIndex]: { points } };
      await supabase
        .from("vehicles")
        .update({ covering_zone: updated })
        .eq("id", vehicleId);
      setZone(updated);
      setSaving(false);
    },
    [vehicleId, zone],
  );

  const clearZone = useCallback(
    async (photoIndex: number) => {
      setSaving(true);
      const updated = { ...(zone ?? {}) };
      delete updated[photoIndex];
      const newZone = Object.keys(updated).length ? updated : null;
      await supabase
        .from("vehicles")
        .update({ covering_zone: newZone })
        .eq("id", vehicleId);
      setZone(newZone);
      setSaving(false);
    },
    [vehicleId, zone],
  );

  return { zone, loading, saving, saveZone, clearZone };
}
