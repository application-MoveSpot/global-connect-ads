import { useEffect, useRef } from "react";

export type ProviderPosition = {
  id: string;
  provider_id: string;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  recorded_at: string;
  provider_profiles?: { full_name: string; company: string } | null;
};

export function ProviderPositionMap({ positions }: { positions: ProviderPosition[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    let map: import("leaflet").Map | null = null;

    if (!document.getElementById("leaflet-css-provider")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-provider";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((mod) => {
      const L = (mod.default ?? mod) as typeof import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Group positions by provider to draw polylines
      const byProvider: Record<string, ProviderPosition[]> = {};
      for (const p of positions) {
        if (!byProvider[p.provider_id]) byProvider[p.provider_id] = [];
        byProvider[p.provider_id].push(p);
      }

      const center: [number, number] =
        positions.length > 0 ? [positions[0].lat, positions[0].lng] : [46.6, 2.35];
      map = L.map(container.current!, { center, zoom: positions.length > 0 ? 12 : 5 });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];
      let colorIdx = 0;

      for (const [, pts] of Object.entries(byProvider)) {
        const sorted = [...pts].sort(
          (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
        );
        const color = colors[colorIdx % colors.length];
        colorIdx++;

        const latlngs = sorted.map((p) => [p.lat, p.lng] as [number, number]);
        if (latlngs.length > 1) {
          L.polyline(latlngs, { color, weight: 3, opacity: 0.8 }).addTo(map!);
        }

        // Most recent position = marker
        const last = sorted[sorted.length - 1];
        const name = last.provider_profiles?.company || last.provider_profiles?.full_name || "Prestataire";
        const time = new Date(last.recorded_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const icon = L.divIcon({
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
          className: "",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        L.marker([last.lat, last.lng], { icon })
          .addTo(map!)
          .bindPopup(`<strong>${name}</strong><br/>Dernière position : ${time}`);
      }

      if (positions.length > 0) {
        const allLatlngs = positions.map((p) => [p.lat, p.lng] as [number, number]);
        map.fitBounds(L.latLngBounds(allLatlngs), { padding: [32, 32] });
      }
    });

    return () => {
      map?.remove();
    };
  }, [positions]);

  return (
    <div
      ref={container}
      className="w-full rounded-xl border border-border overflow-hidden"
      style={{ height: 420 }}
    />
  );
}
