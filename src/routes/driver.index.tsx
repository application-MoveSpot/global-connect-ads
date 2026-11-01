import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { verifyDriverToken, pushPositionBatchWithToken } from "@/lib/qr/qr.functions";
import { GpsBatchBuffer } from "@/lib/tracking/gps-buffer";
import { ObstacleReportDialog } from "@/components/driver/ObstacleReportDialog";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";
import { DriverTrackMap, type TrackPoint } from "@/components/driver/DriverTrackMap";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import { CheckCircle, XCircle, Car } from "lucide-react";

export const Route = createFileRoute("/driver/")({
  head: () => ({
    meta: [{ title: "Chauffeur — MoveSpot" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  component: DriverPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Vehicle = {
  id: string;
  name: string;
  type: string;
  format: string | null;
  zones: string[];
  plate: string | null;
  driverAssigned: boolean;
};

function DriverPage() {
  const { t: tokenSearch } = Route.useSearch();
  const { t } = useTranslation();
  const verify = useServerFn(verifyDriverToken);
  const pushBatch = useServerFn(pushPositionBatchWithToken);

  const [state, setState] = useState<"verifying" | "confirming" | "ready" | "invalid" | "tracking">(
    "verifying",
  );
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [lastPos, setLastPos] = useState<TrackPoint | null>(null);
  const [sessionTrack, setSessionTrack] = useState<TrackPoint[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const tokenRef = useRef<string>(tokenSearch);
  const bufferRef = useRef<GpsBatchBuffer | null>(null);

  useEffect(() => {
    const stored =
      typeof localStorage !== "undefined" ? localStorage.getItem("movespot_driver_token") : null;
    const tok = tokenSearch || stored || "";
    if (!tok) {
      setState("invalid");
      setError(t("driver.no_token"));
      return;
    }
    tokenRef.current = tok;
    verify({ data: { token: tok } })
      .then((r: any) => {
        if (r.ok) {
          setVehicle(r.vehicle as Vehicle);
          setState("confirming");
          try {
            localStorage.setItem("movespot_driver_token", tok);
          } catch { /* unavailable in private mode or blocked storage */ }
        } else {
          setState("invalid");
          setError(r.error);
        }
      })
      .catch(() => {
        setState("invalid");
        setError(t("driver.error_verify"));
      });
  }, [tokenSearch, verify, t]);

  const confirmVehicle = () => {
    setState("ready");
    toast.success(t("driver.vehicle_confirmed"));
  };

  const rejectVehicle = () => {
    try {
      localStorage.removeItem("movespot_driver_token");
    } catch { /* unavailable in private mode or blocked storage */ }
    setState("invalid");
    setError(t("driver.invalid_vehicle"));
  };

  const start = async () => {
    if (!navigator.geolocation) {
      toast.error(t("driver.geoloc_unsupported"));
      return;
    }
    try {
      if (navigator.wakeLock) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch { /* unavailable in private mode or blocked storage */ }

    const buffer = new GpsBatchBuffer(
      async (points) => {
        await pushBatch({ data: { token: tokenRef.current, points } });
      },
      (r) => {
        if (r.sent > 0) setCount((c) => c + r.sent);
        setPending(r.pending);
        if (r.failed) toast(t("driver.network_offline"));
      },
      `movespot_gps_buffer_driver`,
    );
    bufferRef.current = buffer;
    buffer.start();
    setPending(buffer.pending);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const added = buffer.add({
          lat: pt.lat,
          lng: pt.lng,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          recordedAt: new Date().toISOString(),
        });
        if (added) {
          setPending(buffer.pending);
          setSessionTrack((prev) => [...prev, pt]);
        }
        setLastPos(pt);
      },
      (err) => toast.error(`GPS : ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    setState("tracking");
    toast.success(t("driver.gps_started"));
  };

  const stop = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch { /* unavailable in private mode or blocked storage */ }
    }
    wakeLockRef.current = null;
    void bufferRef.current?.stop().then(() => setPending(bufferRef.current?.pending ?? 0));
    setSessionTrack([]);
    setState("ready");
    toast(t("driver.gps_stopped"));
  };

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-md mt-8">

        {state === "verifying" && (
          <p className="text-center text-muted-foreground">{t("driver.verifying")}</p>
        )}

        {state === "invalid" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-semibold text-destructive mb-1">{t("driver.invalid_qr")}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {state === "confirming" && vehicle && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">{t("driver.confirm_title")}</span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.name")}</span>
                  <span className="font-semibold">{vehicle.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.type")}</span>
                  <span>{vehicle.type}</span>
                </div>
                {vehicle.format && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("driver.vehicle_format_label")}
                    </span>
                    <span>{vehicle.format}</span>
                  </div>
                )}
                {vehicle.plate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("common.plate")}</span>
                    <span className="font-mono font-bold tracking-wider">{vehicle.plate}</span>
                  </div>
                )}
                {vehicle.zones.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("driver.vehicle_zones_label")}</span>
                    <span className="text-right">{vehicle.zones.join(", ")}</span>
                  </div>
                )}
              </div>

              <p className="text-sm font-medium text-center mb-4">{t("driver.confirm_question")}</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={rejectVehicle}
                  className="flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive py-3 text-sm font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {t("driver.confirm_no")}
                </button>
                <button
                  onClick={confirmVehicle}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t("driver.confirm_yes")}
                </button>
              </div>
            </div>
          </div>
        )}

        {(state === "ready" || state === "tracking") && vehicle && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("driver.vehicle_confirmed_label")}
              </div>
              <div className="font-display text-xl font-bold mt-1">{vehicle.name}</div>
              <div className="text-sm text-muted-foreground">
                {vehicle.type}
                {vehicle.format ? ` · ${vehicle.format}` : ""}
                {vehicle.plate && <span className="ml-2 font-mono font-bold">{vehicle.plate}</span>}
              </div>
              {vehicle.zones.length > 0 && (
                <div className="mt-3 text-left">
                  <WeatherInstallCheck zone={vehicle.zones[0]!} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("driver.traffic_label")}
                    </span>
                    {(() => {
                      const q = encodeURIComponent(vehicle.zones[0]!);
                      return (
                        <>
                          <a
                            href={`https://waze.com/ul?q=${q}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary"
                          >
                            Waze
                          </a>
                          <a
                            href={`https://maps.google.com/maps?q=${q}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary"
                          >
                            Google Maps
                          </a>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {state === "ready" ? (
              <button
                onClick={start}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold hover:bg-primary/90"
              >
                {t("driver.start")}
              </button>
            ) : (
              <>
                <div className="rounded-2xl border border-signal/40 bg-signal/10 p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                    </span>
                    <span className="font-semibold text-signal">{t("driver.in_progress")}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("driver.points_sent", { count })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("driver.pending_desc", { count: pending })}
                  </div>
                  {lastPos && (
                    <div className="text-[10px] font-mono mt-1 text-muted-foreground">
                      {lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}
                    </div>
                  )}
                </div>
                <button
                  onClick={stop}
                  className="w-full rounded-2xl bg-destructive text-destructive-foreground py-3 font-semibold"
                >
                  {t("driver.stop")}
                </button>
                <DriverTrackMap currentPos={lastPos} track={sessionTrack} zones={vehicle.zones} />
                <ObstacleReportDialog token={tokenRef.current} />
                <p className="text-xs text-muted-foreground text-center">
                  {t("driver.keep_screen_on")}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
