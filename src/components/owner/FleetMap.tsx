import { useCallback, useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "leaflet/dist/leaflet.css";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import type { FleetPoint } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

// ── Fallback Leaflet (aucune dépendance WebGL) ────────────────────────────────
function FleetMapLeaflet({ points }: { points: FleetPoint[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let map: import("leaflet").Map | null = null;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      // Fix icône cassée dans bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = points.length > 0 ? [points[0].lat, points[0].lng] : [46.6, 2.35];
      map = L.map(container.current!, { center, zoom: points.length > 0 ? 13 : 5 });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<div style="width:14px;height:14px;border-radius:9999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.25)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const bounds = L.latLngBounds([]);
      for (const p of points) {
        L.marker([p.lat, p.lng], { icon })
          .bindPopup(
            `<strong>${p.campaignName ?? "Campagne"}</strong><br/>${p.company ?? ""}<br/>` +
            `${new Date(p.recordedAt).toLocaleString("fr-FR")}`,
          )
          .addTo(map!);
        bounds.extend([p.lat, p.lng]);
      }
      if (points.length > 0) map!.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    });

    return () => { map?.remove(); };
  }, [points]);

  return <div ref={container} className="h-[520px] w-full rounded-2xl border border-border" />;
}

// ── Carte Mapbox GL 3D ────────────────────────────────────────────────────────
function FleetMapMapbox({ points }: { points: FleetPoint[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<import("mapbox-gl").Marker[]>([]);
  const rafRef = useRef<number | null>(null);
  const [token, setToken] = useState("");
  const [immersive, setImmersive] = useState(false);
  const [orbit, setOrbit] = useState(false);

  useEffect(() => {
    getMapboxToken()
      .then((r) => setToken(r.token))
      .catch(() => setToken(""));
  }, []);

  useEffect(() => {
    if (!token || !container.current || mapRef.current) return;
    import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default ?? mod;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: container.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [2.35, 46.6],
        zoom: 4.2,
        pitch: 0,
        bearing: 0,
        antialias: true,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on("load", () => {
        if (!map.getSource("mapbox-dem")) {
          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
        }
        if (!map.getLayer("movespot-3d-buildings")) {
          map.addLayer({
            id: "movespot-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", ["get", "extrude"], "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#1f2937",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.75,
            },
          });
        }
      });
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default ?? mod;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (points.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();
      for (const p of points) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:9999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.25)";
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 14 }).setHTML(
              `<strong>${p.campaignName ?? "Campagne"}</strong><br/>${p.company ?? ""}<br/>${new Date(p.recordedAt).toLocaleString("fr-FR")}`,
            ),
          )
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([p.lng, p.lat]);
      }
      if (!immersive) map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
    });
  }, [points, token, immersive]);

  const stopOrbit = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const toggleImmersive = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (immersive) {
      stopOrbit(); setOrbit(false);
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, zoom: 4.2, duration: 1500 });
      setImmersive(false);
      return;
    }
    const target = points[0] ? ([points[0].lng, points[0].lat] as [number, number]) : map.getCenter();
    if (map.getSource("mapbox-dem")) map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 });
    map.easeTo({ center: target, pitch: 60, bearing: 180, zoom: 15.5, duration: 2000 });
    setImmersive(true);
  }, [immersive, points, stopOrbit]);

  const toggleOrbit = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (orbit) { stopOrbit(); setOrbit(false); return; }
    setOrbit(true);
    const step = () => {
      const m = mapRef.current;
      if (!m) return;
      m.setBearing((m.getBearing() + 0.12) % 360);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [orbit, stopOrbit]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Carte indisponible : le jeton Mapbox n'est pas configuré.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={immersive ? "default" : "outline"} onClick={toggleImmersive}>
          {immersive ? "Vue plane" : "Vue immersive 3D"}
        </Button>
        <Button type="button" size="sm" variant={orbit ? "default" : "outline"} onClick={toggleOrbit} disabled={!immersive}>
          {orbit ? "Stopper la rotation" : "Rotation 360°"}
        </Button>
      </div>
      <div ref={container} className="h-[520px] w-full rounded-2xl border border-border" />
    </div>
  );
}

// ── Export principal : détection WebGL côté client uniquement (SSR-safe) ──────
export default function FleetMap({ points }: { points: FleetPoint[] }) {
  // null = pas encore évalué (SSR ou premier rendu), true/false = résultat client
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    // Exécuté uniquement sur le client, jamais sur le serveur SSR
    import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default ?? mod;
      setWebglOk(mapboxgl.supported({ failIfMajorPerformanceCaveat: false }));
    }).catch(() => setWebglOk(false));
  }, []);

  // SSR / premier rendu → skeleton neutre (évite le flash de contenu)
  if (webglOk === null) {
    return <div className="h-[520px] w-full rounded-2xl border border-border bg-card animate-pulse" />;
  }

  return webglOk
    ? <FleetMapMapbox points={points} />
    : <FleetMapLeaflet points={points} />;
}
