import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import area from "@turf/area";

export type ZonePolygon = {
  coordinates: [number, number][];
  areaKm2: number;
  detectedZones?: string[];
};

export function polygonToEwkt(coords: [number, number][]) {
  const ring = coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

const NOM_HEADERS = {
  "User-Agent": "MoveSpot/1.0 (contact@move-spot.com)",
  "Accept-Language": "fr",
};

async function reverseGeocode(lat: number, lng: number): Promise<string[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: NOM_HEADERS },
    );
    const j = (await r.json()) as { address?: Record<string, string> };
    const addr = j.address ?? {};
    return [
      addr.quarter,
      addr.suburb,
      addr.neighbourhood,
      addr.city_district,
      addr.town,
      addr.city,
    ].filter(Boolean) as string[];
  } catch {
    return [];
  }
}

async function detectZones(coords: [number, number][]): Promise<string[]> {
  const n = coords.length;
  const cx = coords.reduce((s, [x]) => s + x, 0) / n;
  const cy = coords.reduce((s, [, y]) => s + y, 0) / n;
  const samples: [number, number][] = [[cx, cy], ...coords.slice(0, Math.min(n - 1, 3))];

  const results: string[] = [];
  for (const [lng, lat] of samples) {
    await new Promise((r) => setTimeout(r, 1100));
    results.push(...(await reverseGeocode(lat, lng)));
  }

  const seen = new Set<string>();
  return results
    .filter((z) => {
      const key = z.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

type Props = {
  onChange: (zone: ZonePolygon | null) => void;
  searchQuery?: string;
  center?: [number, number];
  className?: string;
};

export function ZonePolygonDraw({
  onChange,
  searchQuery,
  center = [2.3522, 48.8566],
  className,
}: Props) {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const leafletRef = useRef<unknown>(null);
  const drawingRef = useRef<[number, number][]>([]);
  const markersRef = useRef<unknown[]>([]);
  const polylineRef = useRef<unknown>(null);
  const polygonLayerRef = useRef<unknown>(null);
  const searchMarkerRef = useRef<unknown>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [areaKm2, setAreaKm2] = useState<number | null>(null);
  const [detectedZones, setDetectedZones] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState(() => t("zone_draw.hint_start"));

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("leaflet").then((mod: any) => {
      if (destroyed || mapRef.current) return;
      const L = mod.default ?? mod;
      leafletRef.current = L;

      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: [center[1], center[0]],
        zoom: 11,
        doubleClickZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      const refreshPolyline = () => {
        const m = mapRef.current as {
          removeLayer: (l: unknown) => void;
          addLayer?: (l: unknown) => void;
        } | null;
        if (!m) return;
        if (polylineRef.current) m.removeLayer(polylineRef.current);
        const pts = drawingRef.current;
        if (pts.length > 1) {
          polylineRef.current = L.polyline(
            pts.map(([lng, lat]) => [lat, lng]),
            { color: "#3b82f6", dashArray: "6 4", weight: 2 },
          ).addTo(map);
        }
      };

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        drawingRef.current.push([lng, lat]);
        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          color: "#3b82f6",
          fillColor: "#fff",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        markersRef.current.push(marker);
        refreshPolyline();
        setHint(tRef.current("zone_draw.hint_points", { count: drawingRef.current.length }));
      });

      map.on("dblclick", async () => {
        // Remove the 2 extra click-handler points that preceded dblclick
        if (drawingRef.current.length >= 2) {
          drawingRef.current = drawingRef.current.slice(0, -2);
          const extras = markersRef.current.splice(-2);
          extras.forEach((m) => map.removeLayer(m));
        }
        const coords = drawingRef.current;
        if (coords.length < 3) {
          setHint(tRef.current("zone_draw.hint_min_points"));
          return;
        }

        // Clear preview
        markersRef.current.forEach((m) => map.removeLayer(m));
        markersRef.current = [];
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
          polylineRef.current = null;
        }
        if (polygonLayerRef.current) {
          map.removeLayer(polygonLayerRef.current);
          polygonLayerRef.current = null;
        }

        const ring: [number, number][] = [...coords, coords[0]];
        polygonLayerRef.current = L.polygon(
          ring.map(([lng, lat]) => [lat, lng]),
          { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 2 },
        ).addTo(map);

        const feature = {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ring] },
          properties: {},
        };
        const km2 = area(feature as never) / 1_000_000;
        setAreaKm2(km2);
        setHint(tRef.current("zone_draw.hint_done"));
        drawingRef.current = [];

        setDetecting(true);
        const zones = await detectZones(coords);
        setDetecting(false);
        setDetectedZones(zones);
        onChangeRef.current({
          coordinates: ring,
          areaKm2: Number(km2.toFixed(4)),
          detectedZones: zones,
        });
      });
    });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // Forward geocoding: searchQuery → pan map
  useEffect(() => {
    const q = searchQuery?.trim() ?? "";
    if (q.length < 3) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
          { headers: NOM_HEADERS },
        );
        const results = (await r.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
          boundingbox?: string[];
        }>;
        const map = mapRef.current as {
          fitBounds: (b: [[number, number], [number, number]], o: unknown) => void;
          setView: (c: [number, number], z: number) => void;
          removeLayer: (l: unknown) => void;
          addLayer?: (l: unknown) => void;
        } | null;
        const L = leafletRef.current as {
          marker: (c: [number, number], o: unknown) => unknown;
          divIcon: (o: unknown) => unknown;
        } | null;
        if (results.length > 0 && map && L) {
          const { lat, lon, boundingbox } = results[0];
          if (boundingbox) {
            const [s, n, w, e] = boundingbox.map(parseFloat);
            map.fitBounds(
              [
                [s, w],
                [n, e],
              ],
              { padding: [30, 30] },
            );
          } else {
            map.setView([parseFloat(lat), parseFloat(lon)], 13);
          }
          if (searchMarkerRef.current) map.removeLayer(searchMarkerRef.current);
          searchMarkerRef.current = (
            L.marker([parseFloat(lat), parseFloat(lon)], {
              icon: (L as { divIcon: (o: unknown) => unknown }).divIcon({
                html: `<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
                className: "",
              }),
            }) as { addTo: (m: unknown) => unknown }
          ).addTo(map);
        }
      } catch {
        /* ignore */
      }
      setSearching(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearAll = () => {
    const map = mapRef.current as { removeLayer: (l: unknown) => void } | null;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
    drawingRef.current = [];
    setAreaKm2(null);
    setDetectedZones([]);
    setHint(t("zone_draw.hint_start"));
    onChangeRef.current(null);
  };

  return (
    <div className={className}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
        }}
      >
        <div ref={containerRef} style={{ height: 380, width: "100%" }} />
        <button
          type="button"
          onClick={clearAll}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1000,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            background: "white",
            border: "1px solid #ccc",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
          }}
        >
          🗑 {t("zone_draw.btn_clear")}
        </button>
        {searching && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              zIndex: 1000,
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              background: "white",
              border: "1px solid #ccc",
              boxShadow: "0 1px 4px rgba(0,0,0,.15)",
            }}
          >
            🔍 {t("zone_draw.searching")}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      {detecting && (
        <p className="mt-1 text-xs text-muted-foreground animate-pulse">
          {t("zone_draw.detecting")}
        </p>
      )}
      {detectedZones.length > 0 && !detecting && (
        <p className="mt-1 text-xs text-primary font-medium">
          ✓ {t("zone_draw.zones_detected", { zones: detectedZones.join(", ") })}
        </p>
      )}
      {areaKm2 != null && (
        <p className="mt-1 text-sm">
          {t("zone_draw.area_label")} <strong>{areaKm2.toFixed(2)} km²</strong>
        </p>
      )}
    </div>
  );
}
