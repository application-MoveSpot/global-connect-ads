import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import { useCookieConsent } from "@/hooks/useCookieConsent";

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
  /** Étapes pré-remplies (ex : générées par l'IA). Écrase les étapes initiales vides. */
  initialWaypoints?: string[];
};

/** Piétons / automobilistes croisés par km parcouru (hypothèse urbaine). */
const BASE_TRAFFIC_DENSITY = 1200;

const GEO = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const DIR = "https://api.mapbox.com/directions/v5/mapbox/driving";
const TILEQ = "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery";

export function ItineraryPlanner({ onChange, multiplier = 1, className, initialWaypoints }: Props) {
  const { t, i18n } = useTranslation();
  const consent = useCookieConsent();
  const [token, setToken] = useState("");
  const [steps, setSteps] = useState<string[]>(
    initialWaypoints && initialWaypoints.length > 0 ? initialWaypoints : [""],
  );
  const [coords, setCoords] = useState<([number, number] | null)[]>(
    initialWaypoints && initialWaypoints.length > 0
      ? initialWaypoints.map(() => null)
      : [null],
  );
  const [zones, setZones] = useState<string[]>([]);
  const [pois, setPois] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (consent === "refused") return;
    getMapboxToken()
      .then((r: { token: string }) => setToken(r.token))
      .catch(() => setToken(""));
  }, [consent]);

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
      setError(t("itinerary_planner.err_geocode"));
    }
  };

  /** Trace l'itinéraire, déduit les POI et calcule la distance. */
  const computeRoute = async (list: [number, number][]) => {
    setBusy(true);
    setError("");
    try {
      const path = list
        .slice(0, 25)
        .map(([lng, lat]) => `${lng},${lat}`)
        .join(";");
      const res = await fetch(
        `${DIR}/${path}?geometries=geojson&overview=full&access_token=${token}`,
      );
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route) {
        setError(t("itinerary_planner.err_no_route"));
        return;
      }
      setDistanceKm(route.distance / 1000);

      const line: [number, number][] = route.geometry.coordinates;
      const samples = [0.25, 0.5, 0.75]
        .map((f) => line[Math.floor(line.length * f)])
        .filter(Boolean);
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
      if (found.length > 0)
        setPois((prev) => Array.from(new Set([...prev, ...found])).slice(0, 20));
    } catch {
      setError(t("itinerary_planner.err_unavailable"));
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
    <div
      className={`rounded-lg border border-border bg-secondary/20 p-4 space-y-4 ${className ?? ""}`}
    >
      <div className="text-sm font-semibold">
        {t("itinerary_planner.title")}{" "}
        <span className="text-muted-foreground font-normal">{t("itinerary_planner.subtitle")}</span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-muted-foreground">
          {t("itinerary_planner.steps_label")}
        </label>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={step}
              onChange={(e) => handleStepChange(i, e.target.value)}
              placeholder={t("itinerary_planner.step_placeholder", { n: i + 1 })}
              className="flex-1 rounded-lg bg-input border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {steps.length > 1 && (
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-xs text-muted-foreground hover:text-destructive px-2"
                aria-label={t("itinerary_planner.step_remove_aria", { n: i + 1 })}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep} className="text-xs text-primary hover:underline">
          {t("itinerary_planner.btn_add_step")}
        </button>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">
          {t("itinerary_planner.zones_label")}
        </div>
        {zones.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("itinerary_planner.zones_empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {zones.map((z, i) => (
              <span key={i} className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {z}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1.5">
          {t("itinerary_planner.pois_label")}
        </div>
        {pois.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {busy ? t("itinerary_planner.detecting") : t("itinerary_planner.no_pois")}
          </p>
        ) : (
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {pois.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
        <div className="text-xs font-semibold text-primary">
          {t("itinerary_planner.impressions_label")}
        </div>
        <div className="mt-1 text-2xl font-bold text-primary">
          {impressionsPerDay.toLocaleString(i18n.language)}{" "}
          <span className="text-xs font-normal">{t("itinerary_planner.impressions_unit")}</span>
        </div>
        <p className="mt-1 text-[11px] text-primary/80">
          {distanceKm > 0
            ? t("itinerary_planner.calc_formula", {
                km: distanceKm.toFixed(1),
                density: BASE_TRAFFIC_DENSITY,
                coefSuffix:
                  multiplier !== 1
                    ? t("itinerary_planner.calc_coef_suffix", { coef: multiplier.toFixed(2) })
                    : "",
              })
            : t("itinerary_planner.hint_add_steps")}
        </p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {consent === "refused" && (
        <p className="text-xs text-muted-foreground">
          {t("itinerary_planner.geocoding_consent")}{" "}
          <a href="/cookies" className="underline text-primary">
            {t("itinerary_planner.consent_link")}
          </a>{" "}
          {t("itinerary_planner.consent_suffix")}
        </p>
      )}
      {consent !== "refused" && !token && (
        <p className="text-xs text-muted-foreground">{t("itinerary_planner.map_not_configured")}</p>
      )}
    </div>
  );
}
