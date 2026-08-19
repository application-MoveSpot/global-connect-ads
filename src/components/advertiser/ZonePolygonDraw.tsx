import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";

export type ZonePolygon = {
  coordinates: [number, number][];
  areaKm2: number;
  detectedZones?: string[];
};

export function polygonToEwkt(coords: [number, number][]) {
  const ring = coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

type Props = {
  onChange: (zone: ZonePolygon | null) => void;
  center?: [number, number];
  className?: string;
};

/** Centroïde d'un anneau de coordonnées */
function centroid(coords: [number, number][]): [number, number] {
  const n = coords.length;
  const sum = coords.reduce(([ax, ay], [bx, by]) => [ax + bx, ay + by] as [number, number], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}

/** Reverse geocoding d'un point — renvoie le nom de quartier/commune */
async function reverseGeocode(lng: number, lat: number, token: string): Promise<string[]> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=neighborhood,locality,place&language=fr&limit=3`;
  try {
    const res = await fetch(url);
    const json = await res.json() as { features?: { place_name?: string; text?: string }[] };
    return (json.features ?? []).map((f) => f.text ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

/** Détecte les zones/quartiers couverts par le polygone */
async function detectZones(coords: [number, number][], token: string): Promise<string[]> {
  const points: [number, number][] = [
    centroid(coords),
    ...coords.slice(0, Math.min(coords.length - 1, 4)),
  ];
  const results = await Promise.all(points.map(([lng, lat]) => reverseGeocode(lng, lat, token)));
  const all = results.flat();
  const seen = new Set<string>();
  return all.filter((z) => {
    const key = z.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export function ZonePolygonDraw({ onChange, center = [2.3522, 48.8566], className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [token, setToken] = useState("");
  const [areaKm2, setAreaKm2] = useState<number | null>(null);
  const [detectedZones, setDetectedZones] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    getMapboxToken().then((r: { token: string }) => setToken(r.token)).catch(() => setToken(""));
  }, []);

  useEffect(() => {
    if (!token || !container.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 10,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw, "top-left");

    const sync = async () => {
      const fc = draw.getAll();
      const feature = fc.features.find((f) => f.geometry.type === "Polygon");
      if (!feature) {
        setAreaKm2(null);
        setDetectedZones([]);
        onChangeRef.current(null);
        return;
      }
      fc.features
        .filter((f) => f.id !== feature.id)
        .forEach((f) => draw.delete(String(f.id)));

      const km2 = area(feature as never) / 1_000_000;
      const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];
      setAreaKm2(km2);

      // Détection automatique des zones
      setDetecting(true);
      const zones = await detectZones(coords, token);
      setDetecting(false);
      setDetectedZones(zones);

      onChangeRef.current({ coordinates: coords, areaKm2: Number(km2.toFixed(4)), detectedZones: zones });
    };

    map.on("draw.create", sync);
    map.on("draw.update", sync);
    map.on("draw.delete", sync);

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [token, center]);

  return (
    <div className={className}>
      {token ? (
        <div ref={container} className="h-[380px] w-full rounded-lg border border-border" />
      ) : (
        <div className="flex h-[380px] w-full items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
          Chargement de la carte…
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Cliquez sur l'icône polygone pour dessiner votre zone de ciblage, puis double-cliquez pour terminer.
      </p>
      {detecting && (
        <p className="mt-1 text-xs text-muted-foreground animate-pulse">Détection des quartiers…</p>
      )}
      {detectedZones.length > 0 && !detecting && (
        <p className="mt-1 text-xs text-primary font-medium">
          ✓ Zones détectées : {detectedZones.join(", ")}
        </p>
      )}
      {areaKm2 != null && (
        <p className="mt-1 text-sm">
          Superficie : <strong>{areaKm2.toFixed(2)} km²</strong>
        </p>
      )}
    </div>
  );
}
