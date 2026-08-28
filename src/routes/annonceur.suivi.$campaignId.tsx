import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCampaignPositions, getCampaignMetrics, getCampaignPauseAlerts } from "@/lib/tracking/tracking.functions";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, MapPin, Radio, CreditCard } from "lucide-react";
import { PaymentModeSelector } from "@/components/advertiser/PaymentModeSelector";

export const Route = createFileRoute("/annonceur/suivi/$campaignId")({
  head: () => ({ meta: [{ title: "Suivi temps réel — MoveSpot" }] }),
  component: SuiviPage,
  errorComponent: ({ error }: { error: Error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

type Position = { lat: number; lng: number; recorded_at: string; speed: number | null; heading: number | null };

function SuiviPage() {
  const { campaignId } = Route.useParams();
  const fetchPositions = useServerFn(getCampaignPositions);
  const fetchToken = useServerFn(getMapboxToken);
  const fetchMetrics = useServerFn(getCampaignMetrics);
  const fetchPauseAlerts = useServerFn(getCampaignPauseAlerts);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [live, setLive] = useState(false);

  const { data: tokenData } = useQuery({ queryKey: ["mapbox-token"], queryFn: () => fetchToken() });
  const { data: posData } = useQuery({
    queryKey: ["campaign-positions", campaignId],
    queryFn: () => fetchPositions({ data: { campaignRequestId: campaignId } }),
    refetchInterval: 30_000,
  });
  const { data: metrics } = useQuery({
    queryKey: ["campaign-metrics", campaignId],
    queryFn: () => fetchMetrics({ data: { campaignRequestId: campaignId } }),
    refetchInterval: 60_000,
  });
  const { data: pauseData } = useQuery({
    queryKey: ["campaign-pauses", campaignId],
    queryFn: () => fetchPauseAlerts({ data: { campaignRequestId: campaignId } }),
    refetchInterval: 5 * 60_000,
  });

  const { data: campaign } = useQuery({
    queryKey: ["campaign-meta", campaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_requests")
        .select("id, status, payment_status, total_price")
        .eq("id", campaignId)
        .maybeSingle();
      return data;
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (posData?.positions) setPositions(posData.positions as Position[]);
  }, [posData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`positions-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vehicle_positions", filter: `campaign_request_id=eq.${campaignId}` },
        (payload) => {
          const r = payload.new as { lat: number; lng: number; recorded_at: string; speed: number | null; heading: number | null };
          setPositions((prev) => [...prev, { lat: r.lat, lng: r.lng, recorded_at: r.recorded_at, speed: r.speed, heading: r.heading }]);
          setLive(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  // Init map
  useEffect(() => {
    if (!tokenData?.token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = tokenData.token;
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.3522, 48.8566],
      zoom: 11,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, [tokenData]);

  // Update marker + polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || positions.length === 0) return;

    const last = positions[positions.length - 1];
    const coords: [number, number][] = positions.map((p) => [p.lng, p.lat]);

    const draw = () => {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#0f172a" }).setLngLat([last.lng, last.lat]).addTo(map);
        map.flyTo({ center: [last.lng, last.lat], zoom: 14 });
      } else {
        markerRef.current.setLngLat([last.lng, last.lat]);
      }

      const src = map.getSource("trail") as mapboxgl.GeoJSONSource | undefined;
      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: coords },
      };
      if (src) {
        src.setData(geojson);
      } else {
        map.addSource("trail", { type: "geojson", data: geojson });
        map.addLayer({
          id: "trail-line",
          type: "line",
          source: "trail",
          paint: { "line-color": "#3b82f6", "line-width": 3, "line-opacity": 0.7 },
        });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [positions]);

  const last = positions[positions.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Radio className={`h-4 w-4 ${live ? "text-green-600 animate-pulse" : "text-muted-foreground"}`} />
              <span>{live ? "Live" : "En attente de positions"}</span>
            </div>
            <Link
              to="/annonceur/rapport/$campaignId"
              params={{ campaignId }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition"
            >
              📄 Rapport PDF
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 p-4">
        {campaign?.status === "approved" && campaign.payment_status !== "paid" && campaign.total_price && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Paiement de la campagne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Total : <strong>{Number(campaign.total_price).toFixed(2)} €</strong> (prix par jour × durée).
                MoveSpot conserve 30 % et reverse 70 % au propriétaire à la fin de la diffusion.
              </p>
              <PaymentModeSelector
                campaignRequestId={campaignId}
                totalPriceEur={Number(campaign.total_price)}
                vehicleQuantity={1}
              />
            </CardContent>
          </Card>
        )}
        {campaign?.payment_status === "paid" && (
          <Card>
            <CardContent className="py-4 text-sm text-emerald-700">✅ Campagne payée. Votre diffusion est confirmée.</CardContent>
          </Card>
        )}
        {pauseData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {pauseData.hasViolation
                  ? <AlertTriangle className="h-5 w-5 text-destructive" />
                  : <CheckCircle className="h-5 w-5 text-emerald-600" />}
                Conformité pauses conducteur (CE 561/2006 Art.7)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pauseData.hasViolation ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p className="font-semibold">Violation détectée — durée de conduite continue dépassant 4h30 sans pause adéquate</p>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">Aucune violation de pause détectée aujourd'hui.</p>
              )}
              {pauseData.analysis && pauseData.analysis.blocks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blocs de conduite du jour</p>
                  <div className="divide-y rounded-md border text-sm">
                    {pauseData.analysis.blocks.map((b: any, i: number) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 ${b.durationMinutes > 270 && !b.breakAdequate ? "bg-destructive/5" : ""}`}>
                        <div>
                          <span className="font-mono">
                            {new Date(b.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {" → "}
                            {new Date(b.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {b.breakAfterMinutes !== null && (
                            <span className={`ml-2 text-xs ${b.breakAdequate ? "text-emerald-600" : "text-amber-600"}`}>
                              pause {b.breakAfterMinutes} min {b.breakAdequate ? "✓" : "⚠ insuffisante"}
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-xs ${b.durationMinutes > 270 ? "text-destructive font-bold" : b.durationMinutes > 240 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {Math.floor(b.durationMinutes / 60)}h{String(b.durationMinutes % 60).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total conduite : {Math.floor(pauseData.analysis.totalDrivingMinutes / 60)}h{String(pauseData.analysis.totalDrivingMinutes % 60).padStart(2, "0")} — plus long bloc : {Math.floor(pauseData.analysis.longestBlockMinutes / 60)}h{String(pauseData.analysis.longestBlockMinutes % 60).padStart(2, "0")}.
                    Données basées sur les points GPS de la campagne aujourd'hui.
                  </p>
                </div>
              )}
              {pauseData.analysis === null && (
                <p className="text-xs text-muted-foreground">Pas encore assez de points GPS aujourd'hui pour analyser les pauses.</p>
              )}
            </CardContent>
          </Card>
        )}
        {metrics && metrics.totals.pointsTotal > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Couverture de la zone ciblée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Stat
                  label="Taux de couverture"
                  value={metrics.coverageRate != null ? `${Math.round(metrics.coverageRate * 100)} %` : "—"}
                />
                <Stat
                  label="Distance en zone"
                  value={`${(metrics.totals.distanceInZoneM / 1000).toFixed(1)} km`}
                />
                <Stat
                  label="Distance totale"
                  value={`${(metrics.totals.distanceM / 1000).toFixed(1)} km`}
                />
                <Stat
                  label="Minutes actives"
                  value={`${metrics.totals.activeMinutes} min`}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {metrics.totals.pointsInZone} point(s) GPS sur {metrics.totals.pointsTotal} relevés à
                l'intérieur de votre zone de ciblage, cumulés sur {metrics.days.length} jour(s) de diffusion.
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Suivi GPS de la campagne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={mapContainer} className="h-[500px] w-full rounded-md border" />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <Stat label="Points reçus" value={positions.length} />
              <Stat label="Dernière position" value={last ? new Date(last.recorded_at).toLocaleTimeString("fr-FR") : "—"} />
              <Stat label="Vitesse" value={last?.speed != null ? `${Math.round(last.speed * 3.6)} km/h` : "—"} />
              <Stat label="Coord." value={last ? `${last.lat.toFixed(4)}, ${last.lng.toFixed(4)}` : "—"} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}
