import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import { supabase } from "@/integrations/supabase/client";
import { MapConsentGate } from "@/components/app/MapConsentGate";

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

type VehicleTypeCount = { type: string; count: number };

const FRENCH_CITIES: Omit<Hub, "vehicles" | "status">[] = [
  { id: "par", city: "Paris", country: "FR", flag: "🇫🇷", lng: 2.3522, lat: 48.8566 },
  { id: "lyo", city: "Lyon", country: "FR", flag: "🇫🇷", lng: 4.8357, lat: 45.764 },
  { id: "mar", city: "Marseille", country: "FR", flag: "🇫🇷", lng: 5.3698, lat: 43.2965 },
  { id: "bor", city: "Bordeaux", country: "FR", flag: "🇫🇷", lng: -0.5792, lat: 44.8378 },
  { id: "tou", city: "Toulouse", country: "FR", flag: "🇫🇷", lng: 1.4442, lat: 43.6047 },
  { id: "nic", city: "Nice", country: "FR", flag: "🇫🇷", lng: 7.262, lat: 43.7102 },
  { id: "nan", city: "Nantes", country: "FR", flag: "🇫🇷", lng: -1.5534, lat: 47.2184 },
  { id: "str", city: "Strasbourg", country: "FR", flag: "🇫🇷", lng: 7.7521, lat: 48.5734 },
];

// Types qui ne sont PAS des véhicules et ne doivent jamais apparaître dans les stats
const EXCLUDED_TYPES = new Set(["sac_a_dos_lcd", "sac_a_dos_affiche"]);

function vehicleStatus(count: number): Hub["status"] {
  if (count >= 20) return "high";
  if (count >= 5) return "medium";
  return "low";
}

const statusColor: Record<Hub["status"], string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "#ef4444",
};

export function MobilityMap() {
  const { t, i18n } = useTranslation();
  const getVehicleLabel = (type: string) => {
    const labels: Record<string, string> = {
      taxi: t("mobility_map.type_taxi"),
      van: t("mobility_map.type_van"),
      food_truck: t("mobility_map.type_food_truck"),
      scooter: t("mobility_map.type_scooter"),
      voiture: t("mobility_map.type_voiture"),
      velo_cargo: t("mobility_map.type_velo_cargo"),
      velo_remorque: t("mobility_map.type_velo_remorque"),
      triporteur: t("mobility_map.type_triporteur"),
      camion_led: t("mobility_map.type_camion_led"),
      tutuk: t("mobility_map.type_tutuk"),
      autre: t("mobility_map.type_autre"),
    };
    return labels[type] ?? type;
  };
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selected, setSelected] = useState<Hub | null>(null);
  // type counts per city id: { "par": [{type, count}, ...], ... }
  const [cityTypeCounts, setCityTypeCounts] = useState<Record<string, VehicleTypeCount[]>>({});
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});

  // Load Mapbox token
  useEffect(() => {
    getMapboxToken()
      .then((res: { token: string }) => setToken(res.token))
      .catch(() => setToken(""));
  }, []);

  // Load real vehicle data from Supabase
  useEffect(() => {
    async function loadVehicleData() {
      setLoading(true);
      try {
        // Get all approved vehicles with their owner's city
        const { data: vehicles, error } = await supabase
          .from("vehicles")
          .select("type, owner_profiles!vehicles_owner_id_fkey(city)")
          .eq("status", "approved");

        if (error || !vehicles) {
          setHubs(FRENCH_CITIES.map((c) => ({ ...c, vehicles: 0, status: "low" as const })));
          setLoading(false);
          return;
        }

        // Count by city, and by (city, type) — excluding non-vehicle types
        const cityCount: Record<string, number> = {};
        // cityTypeMap[cityId][type] = count
        const cityTypeMap: Record<string, Record<string, number>> = {};

        for (const v of vehicles) {
          const vtype = v.type;
          // Ignore non-vehicle types in stats
          if (EXCLUDED_TYPES.has(vtype)) continue;

          const ownerCity = (v.owner_profiles as { city?: string | null } | null)?.city ?? "";
          if (!ownerCity) continue;

          const normalized = ownerCity.trim().toLowerCase();
          const match = FRENCH_CITIES.find(
            (c) =>
              c.city.toLowerCase() === normalized || normalized.startsWith(c.city.toLowerCase()),
          );
          const cityKey = match ? match.id : null;
          if (!cityKey) continue;

          cityCount[cityKey] = (cityCount[cityKey] ?? 0) + 1;
          if (!cityTypeMap[cityKey]) cityTypeMap[cityKey] = {};
          cityTypeMap[cityKey][vtype] = (cityTypeMap[cityKey][vtype] ?? 0) + 1;
        }

        // Build hubs with real counts
        const builtHubs: Hub[] = FRENCH_CITIES.map((c) => {
          const count = cityCount[c.id] ?? 0;
          return { ...c, vehicles: count, status: vehicleStatus(count) };
        });

        setHubs(builtHubs);
        setSelected(builtHubs[0]);
        setTotalVehicles(Object.values(cityCount).reduce((a, b) => a + b, 0));

        // Build per-city type top-3
        const perCityTypes: Record<string, VehicleTypeCount[]> = {};
        for (const [cityId, typeObj] of Object.entries(cityTypeMap)) {
          perCityTypes[cityId] = Object.entries(typeObj)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type, count]) => ({ type, count }));
        }
        setCityTypeCounts(perCityTypes);
      } catch {
        setHubs(FRENCH_CITIES.map((c) => ({ ...c, vehicles: 0, status: "low" as const })));
      } finally {
        setLoading(false);
      }
    }

    loadVehicleData();
  }, []);

  // Initialize map once token + hubs are ready
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current || hubs.length === 0) return;

    let destroyed = false;
    mapboxgl.accessToken = token;
    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [2.5, 46.5],
        zoom: 4.5,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("style.load", () => {
        if (destroyed) return;
        map.setFog({
          color: "rgb(10, 15, 25)",
          "high-color": "rgb(30, 40, 70)",
          "horizon-blend": 0.2,
          "space-color": "rgb(5, 8, 15)",
          "star-intensity": 0.6,
        });
      });

      hubs.forEach((hub) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:999px;background:${statusColor[hub.status]};box-shadow:0 0 0 4px ${statusColor[hub.status]}33, 0 0 12px ${statusColor[hub.status]};cursor:pointer;border:2px solid #0f172a;`;
        el.title = `${hub.flag} ${hub.city}`;
        el.addEventListener("click", () => {
          setSelected(hub);
          map.flyTo({ center: [hub.lng, hub.lat], zoom: 7, duration: 1200 });
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
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [token, hubs]);

  const currentVehicles = selected ? (hubs.find((h) => h.id === selected.id)?.vehicles ?? 0) : 0;
  const currentTypeCounts = selected ? (cityTypeCounts[selected.id] ?? []) : [];
  const isLaunching = totalVehicles === 0 && !loading;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <MapConsentGate className="aspect-[16/9]">
        <div className="relative aspect-[16/9] rounded-2xl border border-border bg-gradient-card overflow-hidden shadow-elevated">
          {token ? (
            <div ref={mapContainer} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center grid-pattern">
              <div className="text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
                {t("mobility_map.loading_map")}
              </div>
            </div>
          )}
          {token && (
            <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-signal" /> {t("mobility_map.legend_high")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning" />{" "}
                {t("mobility_map.legend_medium")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive" />{" "}
                {t("mobility_map.legend_low")}
              </span>
            </div>
          )}
        </div>
      </MapConsentGate>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
              {t("mobility_map.loading")}
            </div>
          </div>
        ) : isLaunching ? (
          <LaunchingState />
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("mobility_map.selected_city")}
            </div>
            {selected && (
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selected.flag}</span>
                <div>
                  <div className="font-display text-2xl font-semibold">{selected.city}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("mobility_map.city_country")}
                  </div>
                </div>
              </div>
            )}
            <div className="h-px bg-border" />
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                {t("mobility_map.vehicles_available")}
              </div>
              <div className="font-display text-4xl font-bold tabular-nums text-primary">
                {currentVehicles.toLocaleString(i18n.language)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {currentVehicles === 0
                  ? t("mobility_map.launching_city")
                  : t("mobility_map.verified")}
              </div>
            </div>
            {currentVehicles > 0 && currentTypeCounts.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  {currentTypeCounts.map(({ type, count }) => (
                    <Stat
                      key={type}
                      label={getVehicleLabel(type)}
                      value={count.toLocaleString(i18n.language)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LaunchingState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
      <span className="text-3xl">🚀</span>
      <div className="font-display text-xl font-bold">{t("mobility_map.launching_title")}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("mobility_map.launching_desc")}
      </p>
      <a
        href="/devenir-partenaire"
        className="mt-2 text-xs font-semibold text-primary hover:underline"
      >
        {t("mobility_map.register_vehicle")}
      </a>
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
