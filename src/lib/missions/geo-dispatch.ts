/**
 * Helpers géographiques pour le dispatch de missions.
 * Utilise Turf.js (déjà installé) pour les calculs côté client.
 */

import * as turf from '@turf/turf';
import type { AvailableInstaller, DispatchMissionPayload, DispatchMissionResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Calcul de distance haversine (km) entre deux points
// ─────────────────────────────────────────────────────────────────────────────
export function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to   = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Vérifier si un point est dans un rayon donné (cercle GeoJSON)
// ─────────────────────────────────────────────────────────────────────────────
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number
): boolean {
  return distanceKm(centerLat, centerLng, pointLat, pointLng) <= radiusKm;
}

// ─────────────────────────────────────────────────────────────────────────────
// Créer un cercle GeoJSON (pour affichage sur Mapbox/Leaflet)
// ─────────────────────────────────────────────────────────────────────────────
export function createDispatchCircle(
  lat: number,
  lng: number,
  radiusKm: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle([lng, lat], radiusKm, {
    units: 'kilometers',
    steps: 64,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Trier les poseurs par distance + disponibilité (heuristique simple)
// ─────────────────────────────────────────────────────────────────────────────
export function rankInstallers(installers: AvailableInstaller[]): AvailableInstaller[] {
  return [...installers].sort((a, b) => {
    // Favoriser les positions récentes (< 24h)
    const aFresh = a.last_position_at
      ? Date.now() - new Date(a.last_position_at).getTime() < 86_400_000
      : false;
    const bFresh = b.last_position_at
      ? Date.now() - new Date(b.last_position_at).getTime() < 86_400_000
      : false;

    if (aFresh && !bFresh) return -1;
    if (!aFresh && bFresh) return 1;

    // Puis par distance
    return a.distance_km - b.distance_km;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Appel Edge Function dispatch-missions
// ─────────────────────────────────────────────────────────────────────────────
export async function dispatchMission(
  payload: DispatchMissionPayload
): Promise<DispatchMissionResponse> {
  const { data, error } = await supabase.functions.invoke<DispatchMissionResponse>(
    'dispatch-missions',
    { body: payload }
  );

  if (error) throw new Error(error.message);
  return data!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Géocoder une adresse via Mapbox Geocoding API
// Utilise le server function getMapboxToken() pour éviter d'exposer le token
// dans le bundle client via import.meta.env.VITE_MAPBOX_TOKEN.
// ─────────────────────────────────────────────────────────────────────────────
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const { getMapboxToken } = await import("@/lib/geo/mapbox.functions");
  const { token } = await getMapboxToken();
  if (!token) return null;

  const encoded = encodeURIComponent(address);
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&language=fr&country=fr&limit=1`
  );
  if (!res.ok) return null;

  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { lat, lng };
}
