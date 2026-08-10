import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { getMapboxToken } from "@/lib/mapbox.functions";

export type ZonePolygon = {
  /** Coordonnées GeoJSON (anneau extérieur fermé) */
  coordinates: [number, number][];
  areaKm2: number;
};

/** Convertit un polygone en EWKT (SRID 4326) pour insertion PostGIS. */
export function polygonToEwkt(coords: [number, number][]) {
  const ring = coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

type Props = {
  onChange: (zone: ZonePolygon | null) => void;
  center?: [number, number];
  className?: string;
};

export function ZonePolygonDraw({ onChange, center = [2.3522, 48.8566], className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [token, setToken] = useState("");
  const [areaKm2, setAreaKm2] = useState<number | null>(null);

  useEffect(() => {
    getMapboxToken().then((r) => setToken(r.token)).catch(() => setToken(""));
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

    const sync = () => {
      const fc = draw.getAll();
      const feature = fc.features.find((f) => f.geometry.type === "Polygon");
      if (!feature) {
        setAreaKm2(null);
        onChangeRef.current(null);
        return;
      }
      // Une seule zone à la fois : on supprime les polygones précédents
      fc.features
        .filter((f) => f.id !== feature.id)
        .forEach((f) => draw.delete(String(f.id)));

      const km2 = area(feature as never) / 1_000_000;
      const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];
      setAreaKm2(km2);
      onChangeRef.current({ coordinates: coords, areaKm2: Number(km2.toFixed(4)) });
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
      {areaKm2 != null && (
        <p className="mt-1 text-sm">
          Superficie : <strong>{areaKm2.toFixed(2)} km²</strong>
        </p>
      )}
    </div>
  );
}
