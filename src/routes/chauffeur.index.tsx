import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyDriverToken, pushPositionBatchWithToken } from "@/lib/qr/qr.functions";
import { GpsBatchBuffer } from "@/lib/tracking/gps-buffer";
import { ObstacleReportDialog } from "@/components/driver/ObstacleReportDialog";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/chauffeur/")({
  head: () => ({ meta: [{ title: "Chauffeur — MoveSpot" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  component: DriverPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Vehicle = { id: string; name: string; type: string; format: string | null };

function DriverPage() {
  const { t } = Route.useSearch();
  const verify = useServerFn(verifyDriverToken);
  const pushBatch = useServerFn(pushPositionBatchWithToken);

  const [state, setState] = useState<"verifying" | "ready" | "invalid" | "tracking">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const tokenRef = useRef<string>(t);
  const bufferRef = useRef<GpsBatchBuffer | null>(null);


  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("movespot_driver_token") : null;
    const tok = t || stored || "";
    if (!tok) {
      setState("invalid");
      setError("Aucun token. Scannez le QR collé dans votre véhicule.");
      return;
    }
    tokenRef.current = tok;
    verify({ data: { token: tok } }).then((r: any) => {
      if (r.ok) {
        setVehicle(r.vehicle as Vehicle);
        setState("ready");
        try { localStorage.setItem("movespot_driver_token", tok); } catch {}
      } else {
        setState("invalid");
        setError(r.error);
      }
    }).catch(() => {
      setState("invalid");
      setError("Erreur de vérification.");
    });
  }, [t, verify]);

  const start = async () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }
    // Wake Lock to keep screen on
    try {
      // @ts-ignore
      if (navigator.wakeLock) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {}

    const buffer = new GpsBatchBuffer(
      async (points) => {
        await pushBatch({ data: { token: tokenRef.current, points } });
      },
      (r) => {
        if (r.sent > 0) setCount((c) => c + r.sent);
        setPending(r.pending);
        if (r.failed) toast("Réseau indisponible — points conservés hors ligne");
      },
      `movespot_gps_buffer_driver`,
    );
    bufferRef.current = buffer;
    buffer.start();
    setPending(buffer.pending);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const added = buffer.add({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          recordedAt: new Date().toISOString(),
        });
        if (added) setPending(buffer.pending);
        setLastPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => toast.error(`GPS : ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    setState("tracking");
    toast.success("Suivi GPS démarré");
  };

  const stop = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (wakeLockRef.current) { try { wakeLockRef.current.release(); } catch {} }
    wakeLockRef.current = null;
    void bufferRef.current?.stop().then(() => setPending(bufferRef.current?.pending ?? 0));
    setState("ready");
    toast("Suivi arrêté");
  };

  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-md mt-8">
        <div className="text-center mb-6">
          <div className="text-2xl">📍</div>
          <h1 className="font-display text-2xl font-bold mt-2">MoveSpot Chauffeur</h1>
        </div>

        {state === "verifying" && <p className="text-center text-muted-foreground">Vérification du QR...</p>}

        {state === "invalid" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-semibold text-destructive mb-1">QR invalide</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {(state === "ready" || state === "tracking") && vehicle && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Véhicule</div>
              <div className="font-display text-xl font-bold mt-1">{vehicle.name}</div>
              <div className="text-sm text-muted-foreground">{vehicle.type} · {vehicle.format}</div>
            </div>

            {state === "ready" ? (
              <button
                onClick={start}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold hover:bg-primary/90"
              >
                ▶ Démarrer le suivi GPS
              </button>
            ) : (
              <>
                <div className="rounded-2xl border border-signal/40 bg-signal/10 p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                    </span>
                    <span className="font-semibold text-signal">EN COURS</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{count} position(s) envoyée(s)</div>
                  <div className="text-xs text-muted-foreground">{pending} en attente d'envoi (lot toutes les 5 min)</div>
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
                  ⏹ Arrêter
                </button>
                <ObstacleReportDialog token={tokenRef.current} />
                <p className="text-xs text-muted-foreground text-center">
                  Gardez l'écran allumé et l'app au premier plan. Téléphone branché recommandé.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
