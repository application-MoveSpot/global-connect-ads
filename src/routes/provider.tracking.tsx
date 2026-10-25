import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pushProviderPositionBatch } from "@/lib/tracking/provider-tracking.functions";
import { GpsBatchBuffer } from "@/lib/tracking/gps-buffer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Play, Square, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { useTranslation } from "react-i18next";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/provider/tracking")({
  head: () => ({
    meta: [
      { title: "Ma tournée — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "manifest", href: "/manifest.webmanifest" }],
  }),
  component: ProviderTrackingPage,
  errorComponent: RouteError,
});

function ProviderTrackingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sendBatch = useServerFn(pushProviderPositionBatch);

  const [authReady, setAuthReady] = useState(false);
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

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const bufferRef = useRef<GpsBatchBuffer | null>(null);
  const providerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getOrRefreshSession().then((session) => {
      if (!mounted) return;
      if (!session) {
        navigate({ to: "/provider/inscription" });
        return;
      }
      providerIdRef.current = session.user.id;
      setAuthReady(true);
    });
    return () => { mounted = false; };
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
        wakeLockRef.current = await (
          navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<WakeLockSentinel> } }
        ).wakeLock.request("screen");
      }
    } catch { /* ignore */ }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  async function startTracking() {
    if (!("geolocation" in navigator)) {
      toast.error(t("provider.tracking.toast_no_gps"));
      return;
    }
    setGpsErrorCount(0);
    setSendErrorCount(0);
    setStartedAt(new Date());
    await acquireWakeLock();

    const buffer = new GpsBatchBuffer(
      async (points) => {
        await sendBatch({ data: { points } });
      },
      (r) => {
        setPending(r.pending);
        if (r.failed) {
          setSendErrorCount((c) => c + 1);
        } else {
          setLastSent(new Date());
        }
      },
      `movespot_provider_gps_${providerIdRef.current ?? "me"}`,
    );
    bufferRef.current = buffer;
    buffer.start();
    setPending(buffer.pending);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLastCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
        const added = buffer.add({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          recordedAt: new Date().toISOString(),
        });
        if (added) setPending(buffer.pending);
      },
      (err) => {
        toast.error(t("provider.tracking.toast_gps_error", { message: err.message }));
        setGpsErrorCount((c) => c + 1);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 60_000 },
    );
    setTracking(true);
    toast.success(t("provider.tracking.toast_started"));
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
    toast.success(t("provider.tracking.toast_stopped"));
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      releaseWakeLock();
    };
  }, []);

  void tick;
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mb-2">
          <LogoLink />
        </div>

        <div className="flex items-center justify-between">
          <Link to="/provider" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("provider.tracking.back")}
          </Link>
          <div className="flex items-center gap-1 text-xs">
            {isMounted && !online ? (
              <WifiOff className="h-4 w-4 text-destructive" />
            ) : (
              <Wifi className="h-4 w-4 text-green-600" />
            )}
            <span>{isMounted && !online ? t("owner.tracking.offline") : t("owner.tracking.online")}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> {t("provider.tracking.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("provider.tracking.desc")}</p>

            {!tracking ? (
              <Button onClick={startTracking} className="w-full" size="lg">
                <Play className="mr-2 h-4 w-4" /> {t("provider.tracking.start")}
              </Button>
            ) : (
              <Button onClick={stopTracking} variant="destructive" className="w-full" size="lg">
                <Square className="mr-2 h-4 w-4" /> {t("provider.tracking.stop")}
              </Button>
            )}

            {tracking && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t("provider.tracking.active")}
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {hh}:{mm}:{ss}
                  </span>
                </div>
                {lastCoords && (
                  <p className="text-xs text-muted-foreground">
                    {t("provider.tracking.position")}{" "}
                    {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)}
                    {lastCoords.acc !== undefined && ` (±${Math.round(lastCoords.acc)} m)`}
                  </p>
                )}
                {lastSent && (
                  <p className="text-xs text-muted-foreground">
                    {t("provider.tracking.last_sync")}{" "}
                    {lastSent.toLocaleTimeString("fr-FR")}
                  </p>
                )}
                {pending > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t("provider.tracking.pending_points", { count: pending })}
                  </p>
                )}
              </div>
            )}

            {(gpsErrorCount > 0 || sendErrorCount > 0) && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive space-y-1">
                {gpsErrorCount > 0 && <p>GPS : {gpsErrorCount} {t("provider.tracking.errors")}</p>}
                {sendErrorCount > 0 && <p>Envoi : {sendErrorCount} {t("provider.tracking.errors")}</p>}
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">{t("provider.tracking.privacy_title")}</p>
              <p>{t("provider.tracking.privacy_desc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
