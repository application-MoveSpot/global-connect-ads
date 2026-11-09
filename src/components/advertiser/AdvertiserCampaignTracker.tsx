/**
 * AdvertiserCampaignTracker
 *
 * Carte temps réel pour l'annonceur :
 *   - Zone polygone de la campagne (PostGIS → GeoJSON)
 *   - Marqueurs par véhicule (couleur unique par vehicle_id)
 *   - Tracé polyline du jour par véhicule
 *   - Heatmap de densité
 *   - Subscription Supabase Realtime sur vehicle_positions
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapConsentGate } from "@/components/app/MapConsentGate";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Locate, Radio } from "lucide-react";
import type mapboxgl from "mapbox-gl";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as any;

interface VehiclePosition {
  id: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

interface Props {
  campaignId: string;
  mapboxToken: string;
  /** Height of the map container (Tailwind class or inline style) */
  height?: string;
  /** Show the live indicator badge */
  showLiveBadge?: boolean;
}

// Palette de couleurs distinctes pour jusqu'à 8 véhicules
const VEHICLE_COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

function colorForVehicle(index: number): string {
  return VEHICLE_COLORS[index % VEHICLE_COLORS.length];
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function AdvertiserCampaignTracker({
  campaignId,
  mapboxToken,
  height = "h-[500px]",
  showLiveBadge = true,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mglRef = useRef<typeof mapboxgl | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const vehicleIndexRef = useRef<Map<string, number>>(new Map());
  const nextIndexRef = useRef(0);

  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [live, setLive] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const consent = useCookieConsent();

  // ── Positions du jour depuis la DB ────────────────────────────────────────
  const { data: initialPositions } = useQuery({
    queryKey: ["campaign-tracker-positions", campaignId],
    queryFn: async (): Promise<VehiclePosition[]> => {
      const { data, error } = await db
        .from("vehicle_positions")
        .select("id, vehicle_id, lat, lng, speed, heading, recorded_at")
        .eq("campaign_request_id", campaignId)
        .gte("recorded_at", todayISO())
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VehiclePosition[];
    },
    refetchInterval: 60_000,
    enabled: Boolean(campaignId),
  });

  // ── Zone polygone de la campagne ──────────────────────────────────────────
  const { data: zoneGeoJson } = useQuery({
    queryKey: ["campaign-zone", campaignId],
    queryFn: async (): Promise<GeoJSON.Feature | null> => {
      const { data, error } = await db
        .from("campaign_requests")
        // PostgREST supports geometry casts, not SQL function calls in select.
        .select("zone_polygon_geojson:zone_polygon::json")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const raw = data.zone_polygon_geojson;
      if (!raw) return null;
      try {
        const geometry = typeof raw === "string" ? JSON.parse(raw) : raw;
        return { type: "Feature", geometry, properties: {} };
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(campaignId),
  });

  useEffect(() => {
    if (initialPositions) {
      setPositions((prev) => {
        const rows = new Map(initialPositions.map((p) => [p.id, p]));
        for (const p of prev) {
          if (p.recorded_at >= todayISO()) rows.set(p.id, p);
        }
        return [...rows.values()].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
      });
    }
  }, [initialPositions]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setPositions([]);
    setLive(false);
    vehicleIndexRef.current.clear();
    nextIndexRef.current = 0;
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`tracker-${campaignId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehicle_positions",
          filter: `campaign_request_id=eq.${campaignId}`,
        },
        (payload) => {
          const r = payload.new as VehiclePosition;
          if (!r.vehicle_id || r.recorded_at < todayISO()) return;
          setPositions((prev) => prev.some((p) => p.id === r.id) ? prev : [
            ...prev,
            {
              id: r.id,
              vehicle_id: r.vehicle_id,
              lat: r.lat,
              lng: r.lng,
              speed: r.speed,
              heading: r.heading,
              recorded_at: r.recorded_at,
            },
          ]);
          setLive(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  // ── Init carte ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (consent === "refused" || !mapboxToken || !mapContainer.current) return;
    let cancelled = false;
    let instance: mapboxgl.Map | null = null;
    (async () => {
      await import("mapbox-gl/dist/mapbox-gl.css");
      const mgl = (await import("mapbox-gl")).default;
      const container = mapContainer.current;
      if (cancelled || !container) return;
      mglRef.current = mgl;
      mgl.accessToken = mapboxToken;
      const map = new mgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [2.3522, 48.8566],
        zoom: 11,
      });
      instance = map;
      mapRef.current = map;
      map.addControl(new mgl.NavigationControl(), "top-right");
      map.once("load", () => {
        if (!cancelled) setMapReady(true);
      });
    })().catch((error) => console.error("Unable to load campaign map", error));
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      instance?.remove();
      mapRef.current = null;
      mglRef.current = null;
      setMapReady(false);
    };
  }, [mapboxToken, campaignId, consent]);

  // ── Zone polygone ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !zoneGeoJson) return;

    if (map.getSource("zone-polygon")) return; // déjà ajouté

    map.addSource("zone-polygon", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [zoneGeoJson],
      },
    });
    map.addLayer({
      id: "zone-fill",
      type: "fill",
      source: "zone-polygon",
      paint: { "fill-color": "#3b82f6", "fill-opacity": 0.1 },
    });
    map.addLayer({
      id: "zone-outline",
      type: "line",
      source: "zone-polygon",
      paint: { "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [4, 2] },
    });

    // Centrer la carte sur la zone
    try {
      const coords =
        zoneGeoJson.geometry.type === "Polygon"
          ? (zoneGeoJson.geometry as GeoJSON.Polygon).coordinates[0]
          : [];
      if (coords.length > 0) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60 },
        );
      }
    } catch {
      // non-bloquant
    }
  }, [mapReady, zoneGeoJson]);

  // ── Marqueurs + polylines par véhicule ────────────────────────────────────
  const getVehicleIndex = useCallback((vehicleId: string): number => {
    if (!vehicleIndexRef.current.has(vehicleId)) {
      vehicleIndexRef.current.set(vehicleId, nextIndexRef.current++);
    }
    return vehicleIndexRef.current.get(vehicleId) ?? 0;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mglRef.current;
    if (!map || !mgl || !mapReady || positions.length === 0) return;

    // Regrouper par vehicle_id
    const byVehicle = new Map<string, VehiclePosition[]>();
    for (const p of positions) {
      const arr = byVehicle.get(p.vehicle_id) ?? [];
      arr.push(p);
      byVehicle.set(p.vehicle_id, arr);
    }

    const heatFeatures: GeoJSON.Feature[] = [];

    byVehicle.forEach((pts, vehicleId) => {
      const idx = getVehicleIndex(vehicleId);
      const color = colorForVehicle(idx);
      const sorted = [...pts].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      );
      const last = sorted[sorted.length - 1];
      if (!last) return;
      const coords: [number, number][] = sorted.map((p) => [p.lng, p.lat]);

      // Marqueur véhicule
      const existing = markersRef.current.get(vehicleId);
      const popupContent = document.createElement("p");
      popupContent.className = "m-0 text-xs font-mono";
      popupContent.textContent = `${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}`;
      if (existing) {
        existing.setLngLat([last.lng, last.lat]);
        existing.getPopup()?.setDOMContent(popupContent);
      } else {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        `;
        const marker = new mgl.Marker({ element: el })
          .setLngLat([last.lng, last.lat])
          .setPopup(
            new mgl.Popup({ offset: 10 }).setDOMContent(popupContent),
          )
          .addTo(map);
        markersRef.current.set(vehicleId, marker);

        // Centrer sur le premier véhicule détecté
        if (markersRef.current.size === 1 && !zoneGeoJson) {
          map.flyTo({ center: [last.lng, last.lat], zoom: 14 });
        }
      }

      // Polyline du véhicule
      const sourceId = `trail-${vehicleId}`;
      const layerId = `trail-line-${vehicleId}`;
      const geojson: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords.length === 1 ? [coords[0], coords[0]] : coords },
      };
      const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(geojson);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: { "line-color": color, "line-width": 3, "line-opacity": 0.75 },
        });
      }

      for (const p of pts) {
        heatFeatures.push({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        });
      }
    });

    // Heatmap globale
    const heatCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: heatFeatures,
    };
    const heatSrc = map.getSource("heat-points") as mapboxgl.GeoJSONSource | undefined;
    if (heatSrc) {
      heatSrc.setData(heatCollection);
    } else if (positions.length >= 5) {
      map.addSource("heat-points", { type: "geojson", data: heatCollection });
      map.addLayer(
        {
          id: "heat-layer",
          type: "heatmap",
          source: "heat-points",
          maxzoom: 15,
          paint: {
            "heatmap-weight": 0.4,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33,102,172,0)",
              0.2,
              "rgb(103,169,207)",
              0.4,
              "rgb(209,229,240)",
              0.6,
              "rgb(253,219,199)",
              0.8,
              "rgb(239,138,98)",
              1,
              "rgb(178,24,43)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 20],
            "heatmap-opacity": 0.5,
          },
        },
        // Insérer sous la première polyline pour ne pas masquer les tracés
        `trail-line-${[...byVehicle.keys()][0]}`,
      );
    }
  }, [positions, mapReady, getVehicleIndex, zoneGeoJson]);

  // ── Nettoyage marqueurs au démontage ──────────────────────────────────────
  useEffect(() => {
    const markers = markersRef.current;
    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
    };
  }, []);

  const vehicleIds = [...new Set(positions.map((p) => p.vehicle_id))];
  const lastByVehicle = new Map<string, VehiclePosition>();
  for (const p of positions) {
    const existing = lastByVehicle.get(p.vehicle_id);
    if (!existing || new Date(p.recorded_at) > new Date(existing.recorded_at)) {
      lastByVehicle.set(p.vehicle_id, p);
    }
  }

  return (
    <div className="space-y-3">
      {showLiveBadge && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Radio
            className={`h-4 w-4 ${live ? "text-primary motion-safe:animate-pulse" : "text-muted-foreground"}`}
          />
          <span>{live ? "Données en temps réel" : "En attente de données GPS…"}</span>
          {vehicleIds.length > 0 && (
            <span className="ml-auto text-xs">
              {vehicleIds.length} véhicule{vehicleIds.length > 1 ? "s" : ""} · {positions.length}{" "}
              points aujourd&apos;hui
            </span>
          )}
        </div>
      )}

      <MapConsentGate className={height}>
        <div className={`relative ${height} w-full rounded-md border overflow-hidden`}>
          <div ref={mapContainer} className="h-full w-full" />

          {positions.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/85 backdrop-blur-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-md">
                <Locate className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center px-6">
                <p className="font-semibold text-foreground text-sm">
                  Aucune donnée GPS aujourd&apos;hui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Les positions s&apos;afficheront en temps réel dès que les véhicules seront
                  actifs.
                </p>
              </div>
            </div>
          )}

          {/* Légende véhicules */}
          {vehicleIds.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-md border p-2 space-y-1 text-xs max-w-[180px]">
              {vehicleIds.map((vid) => {
                const idx = getVehicleIndex(vid);
                const color = colorForVehicle(idx);
                const last = lastByVehicle.get(vid);
                return (
                  <div key={vid} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: color }} />
                    <span className="truncate text-muted-foreground font-mono">
                      {vid.slice(0, 8)}
                    </span>
                    {last?.speed != null && (
                      <span className="ml-auto text-muted-foreground shrink-0">
                        {Math.round(last.speed * 3.6)} km/h
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </MapConsentGate>

    </div>
  );
}
