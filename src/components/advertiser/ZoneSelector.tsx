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

const NOM_HEADERS = { "User-Agent": "MoveSpot/1.0 (contact@move-spot.com)", "Accept-Language": "fr" };

// Build a corridor polygon around a route (simple perpendicular offset method)
function corridorPolygon(pts: [number, number][], bufferKm: number): [number, number][] {
  if (pts.length < 2) return [];
  const bufLat = bufferKm / 111.32;
  const mid = pts[Math.floor(pts.length / 2)];
  const bufLng = bufLat / Math.cos((mid[1] * Math.PI) / 180);

  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = (-dy / len) * bufLng;
    const py = (dx / len) * bufLat;
    left.push([pts[i][0] + px, pts[i][1] + py]);
    right.push([pts[i][0] - px, pts[i][1] - py]);
  }

  const ring: [number, number][] = [...left, ...[...right].reverse()];
  ring.push(ring[0]);
  return ring;
}

function circleToPolygon(lng: number, lat: number, radiusKm: number, n = 64): [number, number][] {
  const degLat = radiusKm / 111.32;
  const degLng = degLat / Math.cos((lat * Math.PI) / 180);
  const pts: [number, number][] = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [lng + degLng * Math.cos(a), lat + degLat * Math.sin(a)];
  });
  pts.push(pts[0]);
  return pts;
}

async function geocodeAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: NOM_HEADERS },
    );
    const res = (await r.json()) as Array<{ lat: string; lon: string }>;
    if (res.length === 0) return null;
    return { lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon) };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: NOM_HEADERS },
    );
    const j = (await r.json()) as { address?: Record<string, string> };
    const a = j.address ?? {};
    return [a.quarter, a.suburb, a.neighbourhood, a.city_district, a.town, a.city].filter(
      Boolean,
    ) as string[];
  } catch {
    return [];
  }
}

async function detectZonesPolygon(coords: [number, number][]): Promise<string[]> {
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
      const k = z.toLowerCase().replace(/\s+/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

function osrmProfile(vehicleTypes: string[]): "driving" | "cycling" {
  const cycling = ["velo_cargo", "velo_remorque"];
  if (vehicleTypes.length > 0 && vehicleTypes.every((v) => cycling.includes(v))) return "cycling";
  return "driving";
}

function bufferKmForVehicles(vehicleTypes: string[]): number {
  if (vehicleTypes.includes("camion_led")) return 0.4;
  if (vehicleTypes.some((v) => ["food_truck", "van"].includes(v))) return 0.2;
  if (vehicleTypes.some((v) => ["velo_cargo", "velo_remorque", "triporteur", "tutuk"].includes(v)))
    return 0.08;
  if (vehicleTypes.some((v) => ["scooter"].includes(v))) return 0.1;
  return 0.15; // taxi, voiture, autre, default
}

type Mode = "route" | "simple" | "advanced";

type Props = {
  onChange: (zone: ZonePolygon | null) => void;
  searchQuery?: string;
  center?: [number, number];
  className?: string;
  vehicleTypes?: string[];
};

export function ZoneSelector({
  onChange,
  searchQuery,
  center = [2.3522, 48.8566],
  className,
  vehicleTypes = [],
}: Props) {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [mode, setMode] = useState<Mode>("route");

  // ── Route mode state ────────────────────────────────────────────────────────
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeDistKm, setRouteDistKm] = useState<number | null>(null);
  const [routeDetecting, setRouteDetecting] = useState(false);
  const [routeZones, setRouteZones] = useState<string[]>([]);

  // ── Simple mode state ───────────────────────────────────────────────────────
  const [address, setAddress] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [clng, setClng] = useState(center[0]);
  const [clat, setClat] = useState(center[1]);
  const [simpleSearching, setSimpleSearching] = useState(false);
  const [simpleZones, setSimpleZones] = useState<string[]>([]);

  // ── Advanced mode state ─────────────────────────────────────────────────────
  const [hint, setHint] = useState(() => t("zone.hint_start"));
  const [advArea, setAdvArea] = useState<number | null>(null);
  const [advZones, setAdvZones] = useState<string[]>([]);
  const [advDetecting, setAdvDetecting] = useState(false);
  const [advSearching, setAdvSearching] = useState(false);

  // ── Map refs ────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const leafletRef = useRef<unknown>(null);
  // route mode
  const routeLineRef = useRef<unknown>(null);
  const routeBufferRef = useRef<unknown>(null);
  const routeMarkersRef = useRef<unknown[]>([]);
  // simple mode
  const circleRef = useRef<unknown>(null);
  // advanced mode
  const drawingRef = useRef<[number, number][]>([]);
  const ptMarkersRef = useRef<unknown[]>([]);
  const polylineRef = useRef<unknown>(null);
  const polygonRef = useRef<unknown>(null);
  const searchMarkerRef = useRef<unknown>(null);

  // Stable refs
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const radiusRef = useRef(radiusKm);
  radiusRef.current = radiusKm;
  const simpleZonesRef = useRef(simpleZones);
  simpleZonesRef.current = simpleZones;
  const vehicleTypesRef = useRef(vehicleTypes);
  vehicleTypesRef.current = vehicleTypes;

  // ── Init Leaflet map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let dead = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    import("leaflet").then((mod: any) => {
      if (dead || mapRef.current) return;
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
        zoom: 12,
        doubleClickZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      // Advanced mode polygon drawing
      const refreshPolyline = () => {
        const m = map as { removeLayer: (l: unknown) => void };
        if (polylineRef.current) m.removeLayer(polylineRef.current);
        const pts = drawingRef.current;
        if (pts.length > 1) {
          polylineRef.current = L.polyline(pts.map(([lng, lat]) => [lat, lng]), {
            color: "#3b82f6",
            dashArray: "6 4",
            weight: 2,
          }).addTo(map);
        }
      };

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        if (modeRef.current !== "advanced") return;
        const { lat, lng } = e.latlng;
        drawingRef.current.push([lng, lat]);
        ptMarkersRef.current.push(
          L.circleMarker([lat, lng], {
            radius: 5,
            color: "#3b82f6",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 2,
          }).addTo(map),
        );
        refreshPolyline();
        setHint(tRef.current("zone.hint_points", { n: drawingRef.current.length }));
      });

      map.on("dblclick", async () => {
        if (modeRef.current !== "advanced") return;
        if (drawingRef.current.length >= 2) {
          drawingRef.current = drawingRef.current.slice(0, -2);
          ptMarkersRef.current
            .splice(-2)
            .forEach((m) => (map as { removeLayer: (l: unknown) => void }).removeLayer(m));
        }
        const coords = drawingRef.current;
        if (coords.length < 3) {
          setHint(tRef.current("zone.hint_min_points"));
          return;
        }
        ptMarkersRef.current.forEach((m) =>
          (map as { removeLayer: (l: unknown) => void }).removeLayer(m),
        );
        ptMarkersRef.current = [];
        if (polylineRef.current) {
          (map as { removeLayer: (l: unknown) => void }).removeLayer(polylineRef.current);
          polylineRef.current = null;
        }
        if (polygonRef.current) {
          (map as { removeLayer: (l: unknown) => void }).removeLayer(polygonRef.current);
          polygonRef.current = null;
        }
        const ring: [number, number][] = [...coords, coords[0]];
        polygonRef.current = L.polygon(ring.map(([lng, lat]) => [lat, lng]), {
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        const km2 =
          area({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: {},
          } as never) / 1_000_000;
        setAdvArea(km2);
        setHint(tRef.current("zone.hint_done"));
        drawingRef.current = [];
        setAdvDetecting(true);
        const zones = await detectZonesPolygon(coords);
        setAdvDetecting(false);
        setAdvZones(zones);
        onChangeRef.current({
          coordinates: ring,
          areaKm2: Number(Math.abs(km2).toFixed(4)),
          detectedZones: zones,
        });
      });
    });

    return () => {
      dead = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);

  // ── Simple mode: redraw circle ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "simple") return;
    const L = leafletRef.current as {
      circle: (c: [number, number], o: unknown) => { addTo: (m: unknown) => unknown };
    } | null;
    const map = mapRef.current as { removeLayer: (l: unknown) => void } | null;
    if (!L || !map) return;
    if (circleRef.current) map.removeLayer(circleRef.current);
    circleRef.current = (
      L.circle([clat, clng], {
        radius: radiusKm * 1000,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }) as { addTo: (m: unknown) => unknown }
    ).addTo(map as unknown);
    const coords = circleToPolygon(clng, clat, radiusKm);
    const areaKm2 = Number((Math.PI * radiusKm * radiusKm).toFixed(4));
    onChangeRef.current({ coordinates: coords, areaKm2, detectedZones: simpleZonesRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, radiusKm, clng, clat]);

  // ── Simple mode: address search ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "simple") return;
    const q = address.trim();
    if (q.length < 3) return;
    const timer = setTimeout(async () => {
      setSimpleSearching(true);
      const geo = await geocodeAddress(q);
      if (geo) {
        const map = mapRef.current as { setView: (c: [number, number], z: number) => void } | null;
        map?.setView([geo.lat, geo.lng], 12);
        setClat(geo.lat);
        setClng(geo.lng);
        const zones = await reverseGeocode(geo.lat, geo.lng);
        const deduped = [...new Set(zones)].slice(0, 8);
        setSimpleZones(deduped);
        const coords = circleToPolygon(geo.lng, geo.lat, radiusRef.current);
        const areaKm2 = Number((Math.PI * radiusRef.current * radiusRef.current).toFixed(4));
        onChangeRef.current({ coordinates: coords, areaKm2, detectedZones: deduped });
      }
      setSimpleSearching(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [address, mode]);

  // ── Advanced mode: forward geocoding from parent prop ──────────────────────
  useEffect(() => {
    const q = searchQuery?.trim() ?? "";
    if (q.length < 3 || mode !== "advanced") return;
    const timer = setTimeout(async () => {
      setAdvSearching(true);
      const geo = await geocodeAddress(q);
      if (geo) {
        const map = mapRef.current as {
          setView: (c: [number, number], z: number) => void;
          removeLayer: (l: unknown) => void;
        } | null;
        const L = leafletRef.current as {
          marker: (c: [number, number], o: unknown) => { addTo: (m: unknown) => unknown };
          divIcon: (o: unknown) => unknown;
        } | null;
        if (map && L) {
          map.setView([geo.lat, geo.lng], 13);
          if (searchMarkerRef.current) map.removeLayer(searchMarkerRef.current);
          searchMarkerRef.current = (
            L.marker([geo.lat, geo.lng], {
              icon: L.divIcon({
                html: `<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
                className: "",
              }),
            }) as { addTo: (m: unknown) => unknown }
          ).addTo(map);
        }
      }
      setAdvSearching(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  // ── Route mode: trace route ────────────────────────────────────────────────
  const traceRoute = async () => {
    const from = fromAddr.trim();
    const to = toAddr.trim();
    if (!from || !to) {
      setRouteError(t("zone.err_no_addresses"));
      return;
    }
    setRouteLoading(true);
    setRouteError("");
    setRouteDistKm(null);
    setRouteZones([]);

    const [geoFrom, geoTo] = await Promise.all([geocodeAddress(from), geocodeAddress(to)]);
    if (!geoFrom) { setRouteError(t("zone.err_from_not_found")); setRouteLoading(false); return; }
    if (!geoTo) { setRouteError(t("zone.err_to_not_found")); setRouteLoading(false); return; }

    const profile = osrmProfile(vehicleTypesRef.current);
    try {
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${geoFrom.lng},${geoFrom.lat};${geoTo.lng},${geoTo.lat}?overview=full&geometries=geojson`,
      );
      const data = (await r.json()) as {
        code: string;
        routes?: Array<{
          distance: number;
          geometry: { type: string; coordinates: [number, number][] };
        }>;
      };

      if (data.code !== "Ok" || !data.routes?.length) {
        setRouteError(t("zone.err_route"));
        setRouteLoading(false);
        return;
      }

      const route = data.routes[0];
      const routeCoords: [number, number][] = route.geometry.coordinates;
      const distKm = route.distance / 1000;
      const bufKm = bufferKmForVehicles(vehicleTypesRef.current);
      const areaKm2 = Number((distKm * bufKm * 2).toFixed(4));
      const polygon = corridorPolygon(routeCoords, bufKm);

      // Draw on map
      const map = mapRef.current as {
        removeLayer: (l: unknown) => void;
        fitBounds: (b: [[number, number], [number, number]], o: unknown) => void;
      } | null;
      const L = leafletRef.current as {
        polyline: (pts: [number, number][], o: unknown) => { addTo: (m: unknown) => unknown };
        polygon: (pts: [number, number][], o: unknown) => { addTo: (m: unknown) => unknown };
        circleMarker: (c: [number, number], o: unknown) => { addTo: (m: unknown) => unknown };
      } | null;
      if (map && L) {
        // Clear previous route layers
        if (routeLineRef.current) map.removeLayer(routeLineRef.current);
        if (routeBufferRef.current) map.removeLayer(routeBufferRef.current);
        routeMarkersRef.current.forEach((m) => map.removeLayer(m));
        routeMarkersRef.current = [];

        // Draw corridor (buffer zone)
        if (polygon.length > 0) {
          routeBufferRef.current = (
            L.polygon(polygon.map(([lng, lat]) => [lat, lng] as [number, number]), {
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 1,
              dashArray: "4 4",
            }) as { addTo: (m: unknown) => unknown }
          ).addTo(map);
        }

        // Draw route line
        routeLineRef.current = (
          L.polyline(routeCoords.map(([lng, lat]) => [lat, lng] as [number, number]), {
            color: "#3b82f6",
            weight: 4,
            opacity: 0.85,
          }) as { addTo: (m: unknown) => unknown }
        ).addTo(map);

        // Start/end markers
        routeMarkersRef.current.push(
          (L.circleMarker([geoFrom.lat, geoFrom.lng], { radius: 8, color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1, weight: 2 }) as { addTo: (m: unknown) => unknown }).addTo(map),
        );
        routeMarkersRef.current.push(
          (L.circleMarker([geoTo.lat, geoTo.lng], { radius: 8, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1, weight: 2 }) as { addTo: (m: unknown) => unknown }).addTo(map),
        );

        // Fit map to route
        const lats = routeCoords.map(([, lat]) => lat);
        const lngs = routeCoords.map(([lng]) => lng);
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [40, 40] },
        );
      }

      setRouteDistKm(distKm);
      onChangeRef.current({ coordinates: polygon.length > 0 ? polygon : routeCoords, areaKm2, detectedZones: [] });

      // Detect zones asynchronously
      setRouteDetecting(true);
      const midPt = routeCoords[Math.floor(routeCoords.length / 2)];
      await new Promise((r) => setTimeout(r, 600));
      const zones = await reverseGeocode(midPt[1], midPt[0]);
      const deduped = [...new Set(zones)].slice(0, 8);
      setRouteZones(deduped);
      setRouteDetecting(false);
      onChangeRef.current({ coordinates: polygon.length > 0 ? polygon : routeCoords, areaKm2, detectedZones: deduped });
    } catch {
      setRouteError(t("zone.err_route_generic"));
    }
    setRouteLoading(false);
  };

  // ── Mode switch: clear all layers ──────────────────────────────────────────
  const switchMode = (newMode: Mode) => {
    const map = mapRef.current as { removeLayer: (l: unknown) => void } | null;
    if (map) {
      if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
      if (routeBufferRef.current) { map.removeLayer(routeBufferRef.current); routeBufferRef.current = null; }
      routeMarkersRef.current.forEach((m) => map.removeLayer(m));
      routeMarkersRef.current = [];
      if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }
      ptMarkersRef.current.forEach((m) => map.removeLayer(m));
      ptMarkersRef.current = [];
      if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
      if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
      if (searchMarkerRef.current) { map.removeLayer(searchMarkerRef.current); searchMarkerRef.current = null; }
    }
    drawingRef.current = [];
    setHint(t("zone.hint_start"));
    setAdvArea(null);
    setAdvZones([]);
    setSimpleZones([]);
    setRouteDistKm(null);
    setRouteZones([]);
    setRouteError("");
    onChangeRef.current(null);
    setMode(newMode);
  };

  const clearAdvanced = () => {
    const map = mapRef.current as { removeLayer: (l: unknown) => void } | null;
    if (!map) return;
    ptMarkersRef.current.forEach((m) => map.removeLayer(m));
    ptMarkersRef.current = [];
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (polygonRef.current) { map.removeLayer(polygonRef.current); polygonRef.current = null; }
    if (searchMarkerRef.current) { map.removeLayer(searchMarkerRef.current); searchMarkerRef.current = null; }
    drawingRef.current = [];
    setAdvArea(null);
    setAdvZones([]);
    setHint(t("zone.hint_start"));
    onChangeRef.current(null);
  };

  const bufKm = bufferKmForVehicles(vehicleTypes);
  const circleAreaKm2 = Math.PI * radiusKm * radiusKm;

  return (
    <div className={className}>
      {/* ── Mode toggle ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-3 p-1 rounded-lg bg-secondary/40 w-fit flex-wrap">
        {(
          [
            { v: "route" as Mode, l: t("zone.mode_route") },
            { v: "simple" as Mode, l: t("zone.mode_simple") },
            { v: "advanced" as Mode, l: t("zone.mode_advanced") },
          ] as { v: Mode; l: string }[]
        ).map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => mode !== v && switchMode(v)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === v
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Route mode controls ──────────────────────────────────────────────── */}
      {mode === "route" && (
        <div className="mb-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold text-sm select-none">A</span>
              <input
                type="text"
                value={fromAddr}
                onChange={(e) => setFromAddr(e.target.value)}
                placeholder={t("zone.from_placeholder")}
                className="w-full rounded-lg border border-border bg-card pl-8 pr-4 py-2.5 text-sm"
                onKeyDown={(e) => e.key === "Enter" && traceRoute()}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-bold text-sm select-none">B</span>
              <input
                type="text"
                value={toAddr}
                onChange={(e) => setToAddr(e.target.value)}
                placeholder={t("zone.to_placeholder")}
                className="w-full rounded-lg border border-border bg-card pl-8 pr-4 py-2.5 text-sm"
                onKeyDown={(e) => e.key === "Enter" && traceRoute()}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={traceRoute}
            disabled={routeLoading}
            className="w-full sm:w-auto rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {routeLoading ? t("zone.tracing") : t("zone.trace_btn")}
          </button>
          {vehicleTypes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("zone.visibility_radius", { m: (bufKm * 1000).toFixed(0) })}
            </p>
          )}
        </div>
      )}

      {/* ── Simple mode controls ─────────────────────────────────────────────── */}
      {mode === "simple" && (
        <div className="mb-3 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("zone.address_placeholder")}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 pr-10 text-sm"
            />
            {simpleSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">🔍</span>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-muted-foreground">
                {t("zone.radius_label", { km: radiusKm })}
              </label>
              <span className="text-xs text-muted-foreground">{t("zone.area_approx", { area: circleAreaKm2.toFixed(1) })}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 0,
          overflow: "hidden",
          borderRadius: "0.5rem",
          border: "1px solid hsl(var(--border))",
          isolation: "isolate",
        }}
      >
        <div ref={containerRef} style={{ height: 340, width: "100%" }} />
        {mode === "advanced" && (
          <button
            type="button"
            onClick={clearAdvanced}
            style={{
              position: "absolute", top: 8, right: 8, zIndex: 1000,
              padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: "white", border: "1px solid #ccc", cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,.2)",
            }}
          >
            {t("zone.clear_btn")}
          </button>
        )}
        {advSearching && mode === "advanced" && (
          <div style={{
            position: "absolute", bottom: 8, left: 8, zIndex: 1000,
            padding: "4px 10px", borderRadius: 6, fontSize: 11,
            background: "white", border: "1px solid #ccc", boxShadow: "0 1px 4px rgba(0,0,0,.15)",
          }}>
            {t("zone.locating")}
          </div>
        )}
      </div>

      {/* ── Route mode feedback ──────────────────────────────────────────────── */}
      {mode === "route" && (
        <div className="mt-2 space-y-1">
          {routeError && <p className="text-sm text-destructive">{routeError}</p>}
          {routeDistKm !== null && !routeError && (
            <p className="text-sm">
              {t("zone.distance", { km: routeDistKm.toFixed(1) })}
              {" · "}
              {t("zone.area_estimated", { area: (routeDistKm * bufKm * 2).toFixed(2) })}
            </p>
          )}
          {routeDetecting && (
            <p className="text-xs text-muted-foreground animate-pulse">{t("zone.detecting_zones")}</p>
          )}
          {routeZones.length > 0 && !routeDetecting && (
            <p className="text-xs text-primary font-medium">
              {t("zone.zones_found", { list: routeZones.join(", ") })}
            </p>
          )}
          {!routeDistKm && !routeError && (
            <p className="text-xs text-muted-foreground">
              {t("zone.route_hint")}
            </p>
          )}
        </div>
      )}

      {/* ── Simple mode feedback ─────────────────────────────────────────────── */}
      {mode === "simple" && (
        <div className="mt-2 space-y-1">
          {simpleZones.length > 0 && (
            <p className="text-xs text-primary font-medium">{t("zone.zones_found", { list: simpleZones.join(", ") })}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("zone.simple_hint")}
          </p>
        </div>
      )}

      {/* ── Advanced mode feedback ───────────────────────────────────────────── */}
      {mode === "advanced" && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-muted-foreground">{hint}</p>
          {advDetecting && (
            <p className="text-xs text-muted-foreground animate-pulse">{t("zone.detecting_neighborhoods")}</p>
          )}
          {advZones.length > 0 && !advDetecting && (
            <p className="text-xs text-primary font-medium">{t("zone.zones_found", { list: advZones.join(", ") })}</p>
          )}
          {advArea != null && (
            <p className="text-sm">{t("zone.area_label", { area: advArea.toFixed(2) })}</p>
          )}
        </div>
      )}
    </div>
  );
}
