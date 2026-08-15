import { useEffect, useRef, useState } from "react";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";

export type ItineraryData = {
  /** Étapes saisies (adresses résolues) */
  waypoints: string[];
  /** Zones / quartiers déduits automatiquement */
  zones: string[];
  /** Points d'intérêt détectés le long du trajet */
  pois: string[];
  /** Distance totale du parcours en km */
  distanceKm: number;
  /** Impressions estimées par jour */
  impressionsPerDay: number;
};

type Props = {
  onChange: (data: ItineraryData) => void;
  /** Coefficient appliqué à l'estimation (format × mobilité × plage horaire) */
  multiplier?: number;
  className?: string;
};

/** Piétons / automobilistes croisés par km parcouru (hypothèse urbaine). */
const BASE_TRAFFIC_DENSITY = 1200;

const GEO = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const DIR = "https://api.mapbox.com/directions/v5/mapbox/driving";
const TILEQ = "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery";

export function ItineraryPlanner({ onChange, multiplier = 1, className }: Props) {
  const [token, setToken] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [coords, setCoords] = useState<([number, number] | null)[]>([null]);
  const [zones, setZones] = useState<string[]>([]);
  const [pois, setPois] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    getMapboxToken().then((r) => setToken(r.token)).catch(() => setToken(""));
  }, []);

  const impressionsPerDay = Math.round(distanceKm * BASE_TRAFFIC_DENSITY * multiplier);

  useEffect(() => {
    onChangeRef.current({
      waypoints: steps.map((s) => s.trim()).filter(Boolean),
      zones,
      pois,
      distanceKm,
      impressionsPerDay,
    });
  }, [steps, zones, pois, distanceKm, impressionsPerDay]);

  /** Géocode une étape, extrait la zone puis relance le calcul d'itinéraire. */
  const resolveStep = async (index: number, value: string) => {
    if (!token || value.trim().length < 5) return;
    try {
      const res = await fetch(
        `${GEO}/${encodeURIComponent(value)}.json?access_token=${token}&limit=1&language=fr&country=fr`,
      );
      const data = await res.json();
      const feature = data?.features?.[0];
      if (!feature) return;
      const [lng, lat] = feature.center as [number, number];

      const next = [...coords];
      next[index] = [lng, lat];
      setCoords(next);

      const ctx: { id: string; text: string }[] = feature.context ?? [];
      const zoneName =
        ctx.find((c) => c.id.startsWith("neighborhood"))?.text ??
        ctx.find((c) => c.id.startsWith("locality"))?.text ??
        ctx.find((c) => c.id.startsWith("place"))?.text ??
        feature.text;
      if (zoneName) setZones((prev) => (prev.includes(zoneName) ? prev : [...prev, zoneName]));

      const list = next.filter(Boolean) as [number, number][];
      if (list.length >= 2) await computeRoute(list);
    } catch {
      setError("Recherche d'adresse indisponible pour le moment.");
    }
  };

  /** Trace l'itinéraire, déduit les POI et calcule la distance. */
  const computeRoute = async (list: [number, number][]) => {
    setBusy(true);
    setError("");
    try {
      const path = list.slice(0, 25).map(([lng, lat]) => `${lng},${lat}`).join(";");
      const res = await fetch(`${DIR}/${path}?geometries=geojson&overview=full&access_token=${token}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) { setError("Aucun itinéraire routier entre ces étapes."); return; }
      setDistanceKm(route.distance / 1000);

      const line: [number, number][] = route.geometry.coordinates;
      const samples = [0.25, 0.5, 0.75].map((f) => line[Math.floor(line.length * f)]).filter(Boolean);
      const found: string[] = [];
      for (const [lng, lat] of samples) {
        const r = await fetch(
          `${TILEQ}/${lng},${lat}.json?radius=500&limit=5&dedupe=true&geometry=point&layers=poi_label&access_token=${token}`,
        );
        const d = await r.json();
        for (const f of d?.features ?? []) {
          const name = f?.properties?.name;
          if (name) found.push(name);
        }
      }
      if (found.length > 0) setPois((prev) => Array.from(new Set([...prev, ...found])).slice(0, 20));
    } catch {
      setError("Calcul de l'itinéraire indisponible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const handleStepChange = (index: number, value: string) => {
    setSteps((cur) => cur.map((s, i) => (i === index ? value : s)));
    clearTimeout(timers.current[index]);
    timers.current[index] = setTimeout(() => resolveStep(index, value), 600);
  };

  const addStep = () => {
    setSteps((cur) => [...cur, ""]);
    setCoords((cur) => [...cur, null]);
  };

  const removeStep = (index: number) => {
    setSteps((cur) => cur.filter((_, i) => i !== index));
    setCoords((cur) => cur.filter((_, i) => i !== index));
  };

  return (
    <div className={`rounded-lg border border-border bg-secondary/20 p-4 space-y-4 ${className ?? ""}`}>
      <div className="text-sm font-semibold">
        🗺 Itinéraire de diffusion{" "}
        <span className="text-muted-foreground font-normal">— zones, POI et impressions calculés automatiquement</span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">Étapes du parcours (une par ligne)</label>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={step}
              onChange={(e) => handleStepChange(i, e.target.value)}
              placeholder={`Étape ${i + 1} (ex : Gare de Lyon, Paris)`}
              className="flex-1 rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-xs text-muted-foreground hover:text-destructive px-2"
                aria-label={`Supprimer l'étape ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep} className="text-xs text-primary hover:underline">
          ➕ Ajouter une étape
        </button>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Zones / quartiers ciblés</div>
        {zones.length === 0 ? (
          <p className="text-xs text-muted-foreground">En attente de saisie…</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z, i) => (
              <span key={i} className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">{z}</span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">Points d'intérêt couverts à proximité</div>
        {pois.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {busy ? "Détection en cours…" : "Aucun point détecté pour le moment."}
          </p>
        ) : (
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {pois.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </div>

      <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
        <div className="text-xs font-semibold text-primary">Impressions estimées / jour</div>
        <div className="mt-1 text-2xl font-bold text-primary">
          {impressionsPerDay.toLocaleString("fr-FR")}{" "}
          <span className="text-xs font-normal">impressions / jour</span>
        </div>
        <p className="mt-1 text-[11px] text-primary/80">
          {distanceKm > 0
            ? `${distanceKm.toFixed(1)} km de parcours × ${BASE_TRAFFIC_DENSITY} personnes croisées/km${multiplier !== 1 ? ` × coef ${multiplier.toFixed(2)}` : ""}`
            : "Saisissez au moins deux étapes pour lancer le calcul."}
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {!token && <p className="text-xs text-muted-foreground">Service cartographique non configuré.</p>}
    </div>
  );
}
