import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getOwnerVehiclesForTracking,
  getActiveCampaignForVehicle,
  pushPositionBatch,
} from "@/lib/tracking.functions";
import { GpsBatchBuffer } from "@/lib/gps-buffer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Play, Square, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/proprietaire/tracking")({
  head: () => ({
    meta: [{ title: "Suivi GPS — MoveSpot" }],
    links: [{ rel: "manifest", href: "/manifest.webmanifest" }],
  }),
  component: TrackingPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Erreur : {error.message}</div>
  ),
});

function TrackingPage() {
  const navigate = useNavigate();
  const fetchVehicles = useServerFn(getOwnerVehiclesForTracking);
  const fetchCampaign = useServerFn(getActiveCampaignForVehicle);
  const sendPositionBatch = useServerFn(pushPositionBatch);

  const [authReady, setAuthReady] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [tracking, setTracking] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastSendRef = useRef<number>(0);
  const SEND_INTERVAL_MS = 20_000;

  const { data: vehiclesData } = useQuery({
    queryKey: ["tracking-vehicles"],
    queryFn: () => fetchVehicles(),
    enabled: authReady,
    retry: false,
  });

  const { data: campaignData } = useQuery({
    queryKey: ["tracking-campaign", vehicleId],
    queryFn: () => fetchCampaign({ data: { vehicleId } }),
    enabled: authReady && !!vehicleId,
    retry: false,
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/proprietaire/inscription" });
        return;
      }
      setAuthReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    setIsMounted(true);
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [tracking]);

  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: "screen") => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
      }
    } catch {
      // ignore
    }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  async function startTracking() {
    if (!vehicleId) {
      toast.error("Sélectionnez un véhicule");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Géolocalisation non supportée sur cet appareil");
      return;
    }
    setErrorCount(0);
    setStartedAt(new Date());
    await acquireWakeLock();

    const campaignRequestId = campaignData?.campaign?.id ?? null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        setLastCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        if (now - lastSendRef.current < SEND_INTERVAL_MS) return;
        lastSendRef.current = now;
        try {
          await sendPosition({
            data: {
              vehicleId,
              campaignRequestId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
              speed: pos.coords.speed ?? null,
              heading: pos.coords.heading ?? null,
            },
          });
          setLastSent(new Date());
        } catch (e) {
          setErrorCount((c) => c + 1);
          console.error("pushPosition error", e);
        }
      },
      (err) => {
        toast.error(`GPS : ${err.message}`);
        setErrorCount((c) => c + 1);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
    );
    setTracking(true);
    toast.success("Suivi GPS démarré");
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    setTracking(false);
    setStartedAt(null);
    toast.success("Suivi GPS arrêté");
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      releaseWakeLock();
    };
  }, []);

  const vehicles = vehiclesData?.vehicles ?? [];
  const campaign = campaignData?.campaign ?? null;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  void tick;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/proprietaire" className="text-sm text-muted-foreground hover:text-foreground">← Retour</Link>
          <div className="flex items-center gap-1 text-xs">
            {isMounted && !online ? <WifiOff className="h-4 w-4 text-destructive" /> : <Wifi className="h-4 w-4 text-green-600" />}
            <span>{isMounted && !online ? "Hors ligne" : "En ligne"}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Suivi GPS du véhicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Véhicule</label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={tracking}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Aucun véhicule approuvé.</p>
              )}
            </div>

            {vehicleId && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                {campaign ? (
                  <>
                    <p className="font-medium">📢 Campagne en cours</p>
                    <p className="text-muted-foreground">{campaign.company} — {campaign.spot_name}</p>
                    <p className="text-xs text-muted-foreground">Jusqu'au {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("fr-FR") : "—"}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Aucune campagne active aujourd'hui. Les positions seront enregistrées sans lien de campagne.</p>
                )}
              </div>
            )}

            {!tracking ? (
              <Button onClick={startTracking} className="w-full" size="lg" disabled={!vehicleId}>
                <Play className="mr-2 h-4 w-4" /> Démarrer le partage GPS
              </Button>
            ) : (
              <Button onClick={stopTracking} variant="destructive" className="w-full" size="lg">
                <Square className="mr-2 h-4 w-4" /> Arrêter le partage
              </Button>
            )}

            {tracking && (
              <div className="space-y-2 rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durée</span>
                  <span className="font-mono">{hh}:{mm}:{ss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière position</span>
                  <span className="font-mono">{lastSent ? lastSent.toLocaleTimeString("fr-FR") : "—"}</span>
                </div>
                {lastCoords && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Coord.</span>
                    <span className="font-mono">{lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)} (±{Math.round(lastCoords.acc ?? 0)}m)</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <p className="text-xs text-destructive">{errorCount} erreur(s) d'envoi</p>
                )}
              </div>
            )}

            <div className="rounded-md bg-blue-500/5 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">💡 Conseils</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Gardez le téléphone branché et l'écran allumé (verrouillé d'écran maintenu auto).</li>
                <li>Ajoutez l'application à l'écran d'accueil pour un usage type appli.</li>
                <li>Une position est envoyée toutes les ~20 secondes.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
