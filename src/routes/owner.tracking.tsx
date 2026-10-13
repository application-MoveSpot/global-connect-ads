import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getOwnerVehiclesForTracking,
  getActiveCampaignForVehicle,
  pushPositionBatch,
} from "@/lib/tracking/tracking.functions";
import { GpsBatchBuffer } from "@/lib/tracking/gps-buffer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, MapPin, Play, Square, Wifi, WifiOff } from "lucide-react";
import { getDrivingRules } from "@/lib/fleet/driving-rules";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/owner/tracking")({
  head: () => ({
    meta: [{ title: "Suivi GPS — MoveSpot" }],
    links: [{ rel: "manifest", href: "/manifest.webmanifest" }],
  }),
  component: TrackingPage,
  errorComponent: ({ error }: { error: Error }) => {
    const { t } = useTranslation();
    return <div className="p-8 text-center text-destructive">{t("owner.tracking.error", { message: error.message })}</div>;
  },
});

function TrackingPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const navigate = useNavigate();
  const fetchVehicles = useServerFn(getOwnerVehiclesForTracking);
  const fetchCampaign = useServerFn(getActiveCampaignForVehicle);
  const sendPositionBatch = useServerFn(pushPositionBatch);

  const [authReady, setAuthReady] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [tracking, setTracking] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [gpsErrorCount, setGpsErrorCount] = useState(0);
  const [sendErrorCount, setSendErrorCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState(0);
  // Suivi pause conducteur (Règlement CE 561/2006 Art.7)
  const [lastStopAt, setLastStopAt] = useState<Date | null>(null);
  const [continuousDrivingMin, setContinuousDrivingMin] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const bufferRef = useRef<GpsBatchBuffer | null>(null);

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
    getOrRefreshSession().then((session) => {
      if (!mounted) return;
      if (!session) {
        navigate({ to: "/owner/inscription" });
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
    const i = setInterval(() => {
      setTick((t) => t + 1);
      // Recalcule la durée de conduite continue depuis la dernière pause détectée
      if (lastStopAt) {
        setContinuousDrivingMin(Math.floor((Date.now() - lastStopAt.getTime()) / 60_000));
      }
    }, 1000);
    return () => clearInterval(i);
  }, [tracking, lastStopAt]);

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
      toast.error(t("owner.tracking.toast_select_vehicle"));
      return;
    }
    setLastStopAt(new Date());
    setContinuousDrivingMin(0);
    if (!("geolocation" in navigator)) {
      toast.error(t("owner.tracking.toast_no_gps"));
      return;
    }
    setGpsErrorCount(0);
    setSendErrorCount(0);
    setStartedAt(new Date());
    await acquireWakeLock();

    const campaignRequestId = campaignData?.campaign?.id ?? null;

    const buffer = new GpsBatchBuffer(
      async (points) => {
        await sendPositionBatch({ data: { vehicleId, campaignRequestId, points } });
      },
      (r) => {
        setPending(r.pending);
        if (r.failed) {
          setSendErrorCount((c) => c + 1);
        } else {
          setLastSent(new Date());
        }
      },
      `movespot_gps_buffer_${vehicleId}`,
    );
    bufferRef.current = buffer;
    buffer.start();
    setPending(buffer.pending);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLastCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
        // Détection d'arrêt : vitesse < 2 m/s (≈ 7 km/h) ou inconnue = véhicule stoppé/au pas
        const speedMs = pos.coords.speed;
        if (speedMs === null || speedMs < 2) {
          setLastStopAt(new Date());
          setContinuousDrivingMin(0);
        }
        const added = buffer.add({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: speedMs ?? null,
          heading: pos.coords.heading ?? null,
          recordedAt: new Date().toISOString(),
        });
        if (added) setPending(buffer.pending);
      },
      (err) => {
        toast.error(t("owner.tracking.toast_gps_error", { message: err.message }));
        setGpsErrorCount((c) => c + 1);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 60_000 },
    );
    setTracking(true);
    toast.success(t("owner.tracking.toast_started"));
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    void bufferRef.current?.stop().then(() => setPending(bufferRef.current?.pending ?? 0));
    setTracking(false);
    setStartedAt(null);
    setLastStopAt(null);
    setContinuousDrivingMin(0);
    toast.success(t("owner.tracking.toast_stopped"));
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      releaseWakeLock();
    };
  }, []);

  const vehicles = vehiclesData?.vehicles ?? [];
  const campaign = campaignData?.campaign ?? null;
  const drivingRules = getDrivingRules(campaign?.country_code ?? "EU");
  const warnMin = drivingRules.maxContinuousMin - 30;
  const alertMin = drivingRules.maxContinuousMin;
  const requiredBreakMin = drivingRules.breakMin + 1;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  void tick;

  const drivingHH = String(Math.floor(continuousDrivingMin / 60)).padStart(2, "0");
  const drivingMM = String(continuousDrivingMin % 60).padStart(2, "0");
  const alertHH = String(Math.floor(alertMin / 60)).padStart(2, "0");
  const alertMM = String(alertMin % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/owner" className="text-sm text-muted-foreground hover:text-foreground">
            {t("owner.tracking.back")}
          </Link>
          <div className="flex items-center gap-1 text-xs">
            {isMounted && !online ? <WifiOff className="h-4 w-4 text-destructive" /> : <Wifi className="h-4 w-4 text-green-600" />}
            <span>{isMounted && !online ? t("owner.tracking.offline") : t("owner.tracking.online")}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> {t("owner.tracking.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{t("owner.tracking.vehicle_label")}</label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={tracking}>
                <SelectTrigger>
                  <SelectValue placeholder={t("owner.tracking.vehicle_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">{t("owner.tracking.no_vehicles")}</p>
              )}
            </div>

            {vehicleId && (
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                {campaign ? (
                  <>
                    <p className="font-medium">{t("owner.tracking.campaign_active")}</p>
                    <p className="text-muted-foreground">{campaign.company} — {campaign.spot_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("owner.tracking.campaign_until", {
                        date: campaign.end_date ? new Date(campaign.end_date).toLocaleDateString(dateLocale) : "—",
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("owner.tracking.no_campaign")}</p>
                )}
              </div>
            )}

            {!tracking ? (
              <>
                <Button onClick={startTracking} className="w-full" size="lg" disabled={!vehicleId || !campaign}>
                  <Play className="mr-2 h-4 w-4" /> {t("owner.tracking.start")}
                </Button>
                {vehicleId && !campaign && (
                  <p className="text-xs text-destructive text-center">
                    {t("owner.tracking.no_campaign_hint")}
                  </p>
                )}
              </>
            ) : (
              <Button onClick={stopTracking} variant="destructive" className="w-full" size="lg">
                <Square className="mr-2 h-4 w-4" /> {t("owner.tracking.stop")}
              </Button>
            )}

            {tracking && continuousDrivingMin >= warnMin && (
              <div className={`rounded-md border p-3 text-sm flex gap-2 items-start ${
                continuousDrivingMin >= alertMin
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
              }`}>
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {continuousDrivingMin >= alertMin ? (
                    <>
                      <p className="font-semibold">{t("owner.tracking.break_required_title")}</p>
                      <p className="text-xs mt-0.5">
                        {t("owner.tracking.break_required_detail", { hh: drivingHH, mm: drivingMM, breakMin: requiredBreakMin })}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{t("owner.tracking.break_recommended_title", { remaining: alertMin - continuousDrivingMin })}</p>
                      <p className="text-xs mt-0.5">
                        {t("owner.tracking.break_recommended_detail", { hh: drivingHH, mm: drivingMM, breakMin: requiredBreakMin, alertHH, alertMM })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {tracking && (
              <div className="space-y-2 rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("owner.tracking.stat_duration")}</span>
                  <span className="font-mono">{hh}:{mm}:{ss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("owner.tracking.stat_last_sent")}</span>
                  <span className="font-mono">{lastSent ? lastSent.toLocaleTimeString(dateLocale) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("owner.tracking.stat_pending")}</span>
                  <span className="font-mono">{pending}</span>
                </div>
                {lastCoords && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("owner.tracking.stat_coords")}</span>
                    <span className="font-mono">{lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)} (±{Math.round(lastCoords.acc ?? 0)}m)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("owner.tracking.stat_driving")}</span>
                  <span className={`font-mono ${continuousDrivingMin >= alertMin ? "text-destructive font-bold" : continuousDrivingMin >= warnMin ? "text-amber-600" : ""}`}>
                    {drivingHH}h{drivingMM}
                  </span>
                </div>
                {gpsErrorCount > 0 && (
                  <p className="text-xs text-amber-600">{t("owner.tracking.gps_errors", { count: gpsErrorCount })}</p>
                )}
                {sendErrorCount > 0 && (
                  <p className="text-xs text-destructive">{t("owner.tracking.send_errors", { count: sendErrorCount })}</p>
                )}
              </div>
            )}

            <div className="rounded-md bg-blue-500/5 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">{t("owner.tracking.tips_title")}</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>{t("owner.tracking.tip_1")}</li>
                <li>{t("owner.tracking.tip_2")}</li>
                <li>{t("owner.tracking.tip_3")}</li>
                <li>{t("owner.tracking.tip_4")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
