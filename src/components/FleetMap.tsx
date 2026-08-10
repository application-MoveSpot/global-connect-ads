import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/mapbox.functions";
import type { FleetPoint } from "@/lib/admin.functions";

export default function FleetMap({ points }: { points: FleetPoint[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [token, setToken] = useState("");

  useEffect(() => {
    getMapboxToken()
      .then((r) => setToken(r.token))
      .catch(() => setToken(""));
  }, []);

  useEffect(() => {
    if (!token || !container.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.35, 46.6],
      zoom: 4.2,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
            `<strong>${p.campaignName ?? "Campagne"}</strong><br/>${p.company ?? ""}<br/>${new Date(
              p.recordedAt,
            ).toLocaleString("fr-FR")}`,
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([p.lng, p.lat]);
    }
    map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
  }, [points, token]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Carte indisponible : le jeton Mapbox n'est pas configuré.
      </div>
    );
  }

  return <div ref={container} className="h-[520px] w-full rounded-2xl border border-border" />;
}
