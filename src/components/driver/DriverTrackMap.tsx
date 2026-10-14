/**
 * DriverTrackMap — mini-carte GPS pour la page chauffeur.
 *
 * Affiche :
 *  • Position courante du chauffeur (point bleu pulsant)
 *  • Trace de la session en cours (polyline bleu)
 *  • Marqueurs des zones de campagne (cercles orange, géocodés depuis Open-Meteo)
 *
 * Mapbox GL est chargé dynamiquement pour ne pas alourdir le bundle initial.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import { ChevronDown, ChevronUp, Map } from "lucide-react";
import { MapConsentGate } from "@/components/app/MapConsentGate";

export type TrackPoint = { lat: number; lng: number };

type ZoneMarker = { name: string; lat: number; lng: number };

type Props = {
  currentPos: TrackPoint | null;
  track: TrackPoint[];
  zones: string[];
};

async function geocodeZone(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const city = name
      .split(",")[0]
      .trim()
      .replace(/\s+\d+(e|er|ème|eme)\b/gi, "")
      .trim();
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`,
    );
    const json = await res.json();
    const loc = json.results?.[0];
    if (!loc) return null;
    return { lat: loc.latitude, lng: loc.longitude };
  } catch {
    return null;
  }
}

export function DriverTrackMap({ currentPos, track, zones }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [zoneMarkers, setZoneMarkers] = useState<ZoneMarker[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const tokenRef = useRef<string>("");
  const posMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const fetchToken = useServerFn(getMapboxToken);

  // Géocode les zones une seule fois
  useEffect(() => {
    if (!zones.length) return;
    Promise.all(
      zones.map(async (z) => {
        const geo = await geocodeZone(z);
        return geo ? { name: z.split(",")[0].trim(), ...geo } : null;
      }),
    ).then((results) => setZoneMarkers(results.filter(Boolean) as ZoneMarker[]));
  }, [zones.join(",")]);

  // Charge le token Mapbox
  useEffect(() => {
    fetchToken()
      .then((r: { token: string }) => {
        tokenRef.current = r.token;
        setTokenLoaded(!!r.token);
      })
      .catch(() => {});
  }, []);

  // Initialise la carte quand le panneau s'ouvre et que le token est disponible
  useEffect(() => {
    if (!open || !tokenLoaded || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    import("mapbox-gl").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = tokenRef.current;

      const center: [number, number] = currentPos
        ? [currentPos.lng, currentPos.lat]
        : [2.3488, 48.8534]; // Paris par défaut

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center,
        zoom: 13,
        attributionControl: false,
      });
      mapRef.current = map;

      map.on("load", () => {
        // Source trace GPS
        map.addSource("track", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: track.map((p) => [p.lng, p.lat]),
            },
            properties: {},
          },
        });
        map.addLayer({
          id: "track-line",
          type: "line",
          source: "track",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 3,
            "line-opacity": 0.85,
          },
        });

        // Zones de campagne (cercles orange)
        for (const zm of zoneMarkers) {
          const el = document.createElement("div");
          el.className = "zone-label";
          el.style.cssText = `
            background: rgba(249,115,22,0.18);
            border: 2px solid rgba(249,115,22,0.7);
            color: #fb923c;
            font-size: 11px;
            font-weight: 600;
            border-radius: 20px;
            padding: 3px 8px;
            white-space: nowrap;
            backdrop-filter: blur(4px);
          `;
          el.textContent = `📍 ${zm.name}`;
          new mapboxgl.Marker({ element: el }).setLngLat([zm.lng, zm.lat]).addTo(map);
        }

        // Position courante
        if (currentPos) {
          const el = createPulseMarker();
          posMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([currentPos.lng, currentPos.lat])
            .addTo(map);
        }
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tokenLoaded]);

  // Met à jour position + trace en temps réel
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Track polyline
    const src = map.getSource("track") as import("mapbox-gl").GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: track.map((p) => [p.lng, p.lat]) },
        properties: {},
      });
    }

    // Position courante
    if (currentPos) {
      if (posMarkerRef.current) {
        posMarkerRef.current.setLngLat([currentPos.lng, currentPos.lat]);
      } else {
        import("mapbox-gl").then((mod) => {
          if (!map) return;
          const el = createPulseMarker();
          posMarkerRef.current = new mod.default.Marker({ element: el })
            .setLngLat([currentPos.lng, currentPos.lat])
            .addTo(map);
        });
      }
      // Recentre doucement sur la position
      map.easeTo({ center: [currentPos.lng, currentPos.lat], duration: 800 });
    }
  }, [currentPos, track]);

  // Détruit la carte si le panneau est fermé
  useEffect(() => {
    if (!open && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      posMarkerRef.current = null;
    }
  }, [open]);

  const hasData = currentPos || track.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" />
          {t("driver_track_map.title")}
          {track.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal">
              {t("driver_track_map.points_count", {
                count: track.length,
                s: track.length > 1 ? "s" : "",
              })}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <>
          <MapConsentGate className="h-64">
            {!tokenLoaded ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                {t("driver_track_map.loading_map")}
              </div>
            ) : (
              <div ref={containerRef} className="w-full h-64" />
            )}
          </MapConsentGate>

          {!hasData && tokenLoaded && (
            <p className="px-4 pb-3 text-[10px] text-muted-foreground">
              {t("driver_track_map.hint_no_data")}
            </p>
          )}

          {zoneMarkers.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50 flex flex-wrap gap-2">
              {zoneMarkers.map((zm) => (
                <span
                  key={zm.name}
                  className="text-[10px] text-orange-400 bg-orange-500/10 rounded-full px-2 py-0.5 border border-orange-500/20"
                >
                  📍 {zm.name}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function createPulseMarker(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 16px; height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    border: 2px solid white;
    box-shadow: 0 0 0 0 rgba(59,130,246,0.6);
    animation: gps-pulse 1.8s ease-out infinite;
    position: relative;
  `;
  // Pulse keyframes injectée une seule fois
  if (!document.getElementById("gps-pulse-style")) {
    const style = document.createElement("style");
    style.id = "gps-pulse-style";
    style.textContent = `
      @keyframes gps-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
        70%  { box-shadow: 0 0 0 14px rgba(59,130,246,0); }
        100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
      }
    `;
    document.head.appendChild(style);
  }
  return el;
}
