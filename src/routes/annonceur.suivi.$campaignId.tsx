import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCampaignPositions, getCampaignMetrics, getCampaignPauseAlerts } from "@/lib/tracking/tracking.functions";
import { getInstallationPhotosForAdvertiser } from "@/lib/providers/installation.functions";
import { InstallationPhotoGrid, parseInstallationPhotos } from "@/components/driver/InstallationPhotoGrid";
import { getMapboxToken } from "@/lib/geo/mapbox.functions";
import { supabase } from "@/integrations/supabase/client";
import type mapboxgl from "mapbox-gl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, MapPin, Radio, CreditCard, Camera, Clock, Star, TrendingUp } from "lucide-react";
import { PaymentModeSelector } from "@/components/advertiser/PaymentModeSelector";
import { submitCampaignRating, getCampaignRating } from "@/lib/campaigns/rating.functions";
import { toast } from "sonner";
import { MapConsentGate } from "@/components/app/MapConsentGate";

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
  const fetchInstallPhotos = useServerFn(getInstallationPhotosForAdvertiser);
  const submitRating = useServerFn(submitCampaignRating);
  const fetchRating = useServerFn(getCampaignRating);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mglRef = useRef<typeof mapboxgl | null>(null);
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
  const { data: installData } = useQuery({
    queryKey: ["campaign-install-photos", campaignId],
    queryFn: () => fetchInstallPhotos({ data: { campaignId } }),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const { data: campaign } = useQuery({
    queryKey: ["campaign-meta", campaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_requests")
        .select("id, status, payment_status, total_price, start_date, end_date, spot_name, estimated_impressions_per_day, days_count")
        .eq("id", campaignId)
        .maybeSingle();
      return data;
    },
    refetchInterval: 10_000,
  });

  const { data: ratingData } = useQuery({
    queryKey: ["campaign-rating", campaignId],
    queryFn: () => fetchRating({ data: { campaignRequestId: campaignId } }),
    staleTime: 60_000,
  });

  const existingRating = ratingData?.ratings?.find((r: { rated_role: string; stars: number; comment: string | null }) => r.rated_role === "owner");

  const { data: advertiserMeta } = useQuery({
    queryKey: ["campaign-advertiser-meta", campaignId],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return null;
      const { data: prof } = await supabase
        .from("advertiser_profiles")
        .select("account_type, full_name")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      return prof as { account_type?: string; full_name?: string } | null;
    },
    staleTime: 5 * 60_000,
  });

  const isIndividual = advertiserMeta?.account_type === "individual";

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

  // Init map — dynamic import defers the ~800 KB Mapbox bundle until this view mounts
  useEffect(() => {
    if (!tokenData?.token || !mapContainer.current || mapRef.current) return;
    (async () => {
      await import("mapbox-gl/dist/mapbox-gl.css");
      const mgl = (await import("mapbox-gl")).default;
      mglRef.current = mgl;
      mgl.accessToken = tokenData.token;
      mapRef.current = new mgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [2.3522, 48.8566],
        zoom: 11,
      });
      mapRef.current.addControl(new mgl.NavigationControl(), "top-right");
    })();
  }, [tokenData]);

  // Update marker + polyline
  useEffect(() => {
    const map = mapRef.current;
    const mgl = mglRef.current;
    if (!map || !mgl || positions.length === 0) return;

    const last = positions[positions.length - 1];
    const coords: [number, number][] = positions.map((p) => [p.lng, p.lat]);

    const draw = () => {
      if (!markerRef.current) {
        markerRef.current = new mgl.Marker({ color: "#0f172a" }).setLngLat([last.lng, last.lat]).addTo(map);
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

      // Heatmap layer for position density
      const heatGeojson = {
        type: "FeatureCollection" as const,
        features: positions.map((p) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        })),
      };
      const heatSrc = map.getSource("heat-points") as mapboxgl.GeoJSONSource | undefined;
      if (heatSrc) {
        heatSrc.setData(heatGeojson);
      } else if (positions.length >= 5) {
        map.addSource("heat-points", { type: "geojson", data: heatGeojson });
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
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(33,102,172,0)",
                0.2, "rgb(103,169,207)",
                0.4, "rgb(209,229,240)",
                0.6, "rgb(253,219,199)",
                0.8, "rgb(239,138,98)",
                1, "rgb(178,24,43)",
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 20],
              "heatmap-opacity": 0.5,
            },
          },
          "trail-line",
        );
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
              <span>
                {live
                  ? (isIndividual ? "Votre véhicule est en route 🚗" : "Live")
                  : (isIndividual ? "En attente du démarrage" : "En attente de positions")}
              </span>
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
        {/* Bannière événement pour les particuliers */}
        {isIndividual && campaign?.start_date && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const start = new Date(campaign.start_date); start.setHours(0, 0, 0, 0);
          const d = Math.round((start.getTime() - today.getTime()) / 86400000);
          if (d < 0) return null;
          const urgent = d <= 3;
          return (
            <Card className={urgent ? "border-amber-500/50 bg-amber-500/5" : "border-primary/20 bg-primary/5"}>
              <CardContent className="py-4 flex items-center gap-3 text-sm">
                <Clock className={`h-5 w-5 shrink-0 ${urgent ? "text-amber-600" : "text-primary"}`} />
                <span className={urgent ? "text-amber-900 dark:text-amber-200" : "text-foreground"}>
                  {d === 0
                    ? "🎉 C'est aujourd'hui ! Votre publicité est en cours de diffusion."
                    : d === 1
                    ? "⏰ Votre événement commence demain — votre véhicule est confirmé."
                    : `📅 Votre événement commence dans ${d} jour${d > 1 ? "s" : ""} (${new Date(campaign.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}).`}
                </span>
              </CardContent>
            </Card>
          );
        })()}

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
        {!isIndividual && pauseData && (
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
        {installData && (
          <InstallationPhotosCard
            photos={parseInstallationPhotos(installData.photos)}
            status={installData.status}
            notes={installData.notes}
            reviewedAt={installData.reviewedAt}
          />
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

        {/* ROI dashboard */}
        {campaign && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Estimation ROI campagne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Stat
                  label="Impressions / jour"
                  value={campaign.estimated_impressions_per_day != null
                    ? campaign.estimated_impressions_per_day.toLocaleString("fr-FR")
                    : "—"}
                />
                <Stat
                  label="Impressions totales est."
                  value={campaign.estimated_impressions_per_day != null && campaign.days_count != null
                    ? (campaign.estimated_impressions_per_day * campaign.days_count).toLocaleString("fr-FR")
                    : "—"}
                />
                <Stat
                  label="Coût / 1 000 imp."
                  value={
                    campaign.total_price != null &&
                    campaign.estimated_impressions_per_day != null &&
                    campaign.days_count != null &&
                    campaign.estimated_impressions_per_day * campaign.days_count > 0
                      ? `${((Number(campaign.total_price) / (campaign.estimated_impressions_per_day * campaign.days_count)) * 1000).toFixed(2)} €`
                      : "—"
                  }
                />
                <Stat
                  label="Jours de diffusion"
                  value={campaign.days_count ?? "—"}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Estimations basées sur la densité de trafic de la zone ciblée. Les impressions réelles peuvent varier.
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {isIndividual ? "Où est votre véhicule en ce moment ?" : "Suivi GPS de la campagne"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapConsentGate className="h-[500px]">
              <div ref={mapContainer} className="h-[500px] w-full rounded-md border" />
            </MapConsentGate>
            {positions.length >= 5 && (
              <p className="mt-2 text-xs text-muted-foreground">
                La carte de chaleur indique les zones les plus fréquentées par le véhicule.
              </p>
            )}
            {isIndividual ? (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <Stat label="Mise à jour" value={last ? new Date(last.recorded_at).toLocaleTimeString("fr-FR") : "En attente"} />
                <Stat label="Vitesse actuelle" value={last?.speed != null ? `${Math.round(last.speed * 3.6)} km/h` : "—"} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Stat label="Points reçus" value={positions.length} />
                <Stat label="Dernière position" value={last ? new Date(last.recorded_at).toLocaleTimeString("fr-FR") : "—"} />
                <Stat label="Vitesse" value={last?.speed != null ? `${Math.round(last.speed * 3.6)} km/h` : "—"} />
                <Stat label="Coord." value={last ? `${last.lat.toFixed(4)}, ${last.lng.toFixed(4)}` : "—"} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating section — shown when campaign is active or ended */}
        {campaign && campaign.status === "approved" && !ratingDone && !existingRating && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" /> Évaluer cette campagne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Comment évaluez-vous la qualité du service du propriétaire du véhicule ?
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setRatingHover(s)}
                    onMouseLeave={() => setRatingHover(0)}
                    onClick={() => setRatingStars(s)}
                    className="text-2xl transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${s <= (ratingHover || ratingStars) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
                {ratingStars > 0 && (
                  <span className="ml-2 self-center text-sm text-muted-foreground">
                    {["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"][ratingStars]}
                  </span>
                )}
              </div>
              {ratingStars > 0 && (
                <>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Commentaire optionnel (max 500 caractères)…"
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    disabled={ratingSubmitting}
                    onClick={async () => {
                      setRatingSubmitting(true);
                      try {
                        await submitRating({
                          data: {
                            campaignRequestId: campaignId,
                            stars: ratingStars,
                            comment: ratingComment || undefined,
                            ratedRole: "owner",
                          },
                        });
                        setRatingDone(true);
                        toast.success("Merci pour votre évaluation !");
                      } catch {
                        toast.error("Impossible d'enregistrer l'évaluation.");
                      } finally {
                        setRatingSubmitting(false);
                      }
                    }}
                    className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition"
                  >
                    {ratingSubmitting ? "Envoi…" : "Envoyer l'évaluation"}
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {(ratingDone || existingRating) && (
          <Card>
            <CardContent className="py-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Votre évaluation a été enregistrée — merci !
              {existingRating && (
                <span className="ml-2 flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= existingRating.stars ? "fill-amber-400 text-amber-400" : "text-muted/30"}`} />
                  ))}
                </span>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InstallationPhotosCard({
  photos,
  status,
  notes,
  reviewedAt,
}: {
  photos: ReturnType<typeof parseInstallationPhotos>;
  status: string | null;
  notes: string | null;
  reviewedAt: string | null;
}) {
  const statusConfig: Record<string, { label: string; cls: string }> = {
    pending_approval: { label: "En attente de validation", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
    approved: { label: "Pose validée ✓", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
    rejected: { label: "Photos refusées", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const s = status ? (statusConfig[status] ?? null) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" /> Photos de pose du covering
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {s && (
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${s.cls}`}>
            {s.label}
            {reviewedAt && (
              <span className="opacity-70">
                · {new Date(reviewedAt).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        )}
        {status === "rejected" && notes && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <span className="font-semibold">Motif du refus : </span>{notes}
          </div>
        )}
        <InstallationPhotoGrid photos={photos} />
        {!photos && (
          <p className="text-xs text-muted-foreground">
            Le poseur certifié enverra les photos après la pose du covering sur votre véhicule.
          </p>
        )}
      </CardContent>
    </Card>
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
