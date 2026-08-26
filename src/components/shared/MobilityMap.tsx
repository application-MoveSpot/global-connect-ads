import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";

type Hub = {
  id: string;
  city: string;
  country: string;
  flag: string;
  lng: number;
  lat: number;
  vehicles: number;
  status: "high" | "medium" | "low";
};

const INITIAL_HUBS: Hub[] = [
  { id: "par", city: "Paris", country: "FR", flag: "🇫🇷", lng: 2.3522, lat: 48.8566, vehicles: 1243, status: "high" },
  { id: "nyc", city: "New York", country: "US", flag: "🇺🇸", lng: -74.006, lat: 40.7128, vehicles: 2180, status: "high" },
  { id: "tok", city: "Tokyo", country: "JP", flag: "🇯🇵", lng: 139.6917, lat: 35.6895, vehicles: 1876, status: "high" },
  { id: "dub", city: "Dubai", country: "AE", flag: "🇦🇪", lng: 55.2708, lat: 25.2048, vehicles: 534, status: "medium" },
  { id: "sao", city: "São Paulo", country: "BR", flag: "🇧🇷", lng: -46.6333, lat: -23.5505, vehicles: 412, status: "medium" },
  { id: "sin", city: "Singapore", country: "SG", flag: "🇸🇬", lng: 103.8198, lat: 1.3521, vehicles: 689, status: "medium" },
  { id: "lag", city: "Lagos", country: "NG", flag: "🇳🇬", lng: 3.3792, lat: 6.5244, vehicles: 187, status: "low" },
  { id: "syd", city: "Sydney", country: "AU", flag: "🇦🇺", lng: 151.2093, lat: -33.8688, vehicles: 298, status: "low" },
];

const statusColor: Record<Hub["status"], string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "#ef4444",
};

export function MobilityMap() {
  const [hubs, setHubs] = useState(INITIAL_HUBS);
  const [selected, setSelected] = useState<Hub>(INITIAL_HUBS[0]);
  const [token, setToken] = useState<string>("");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  // Load token from server
  useEffect(() => {
    getMapboxToken().then((res: { token: string }) => setToken(res.token)).catch(() => setToken(""));
  }, []);

  // Update vehicle counts
  useEffect(() => {
    const interval = setInterval(() => {
      setHubs((prev) =>
        prev.map((h) => ({
          ...h,
          vehicles: Math.max(50, h.vehicles + Math.floor((Math.random() - 0.5) * 60)),
        })),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [10, 25],
        zoom: 1.3,
        projection: { name: "globe" },
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("style.load", () => {
        map.setFog({
          color: "rgb(10, 15, 25)",
          "high-color": "rgb(30, 40, 70)",
          "horizon-blend": 0.2,
          "space-color": "rgb(5, 8, 15)",
          "star-intensity": 0.6,
        });
      });

      INITIAL_HUBS.forEach((hub) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:999px;background:${statusColor[hub.status]};box-shadow:0 0 0 4px ${statusColor[hub.status]}33, 0 0 12px ${statusColor[hub.status]};cursor:pointer;border:2px solid #0f172a;`;
        el.title = `${hub.flag} ${hub.city}`;
        el.addEventListener("click", () => {
          setSelected(hub);
          map.flyTo({ center: [hub.lng, hub.lat], zoom: 4, duration: 1500 });
        });
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([hub.lng, hub.lat])
          .addTo(map);
        markersRef.current[hub.id] = marker;
      });

      mapRef.current = map;
    } catch (e) {
      console.error("Mapbox init error", e);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [token]);

  const currentVehicles = hubs.find((h) => h.id === selected.id)?.vehicles ?? 0;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="relative aspect-[16/9] rounded-2xl border border-border bg-gradient-card overflow-hidden shadow-elevated">
        {token ? (
          <div ref={mapContainer} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center grid-pattern">
            <div className="text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
              Chargement de la carte…
            </div>
          </div>
        )}
        {token && (
          <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-signal" /> Haute</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" /> Moyenne</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" /> Faible</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 flex flex-col gap-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Hub sélectionné</div>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{selected.flag}</span>
          <div>
            <div className="font-display text-2xl font-semibold">{selected.city}</div>
            <div className="text-sm text-muted-foreground">{selected.country}</div>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Véhicules disponibles</div>
          <div className="font-display text-4xl font-bold tabular-nums text-primary">
            {currentVehicles.toLocaleString("fr-FR")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Mis à jour en temps réel</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <Stat label="Vélos" value="42%" />
          <Stat label="Scooters" value="31%" />
          <Stat label="Autos" value="27%" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3 text-center">
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
