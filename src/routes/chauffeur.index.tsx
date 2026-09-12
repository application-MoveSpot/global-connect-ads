import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyDriverToken, pushPositionBatchWithToken } from "@/lib/qr/qr.functions";
import { GpsBatchBuffer } from "@/lib/tracking/gps-buffer";
import { ObstacleReportDialog } from "@/components/driver/ObstacleReportDialog";
import { WeatherInstallCheck } from "@/components/provider/WeatherInstallCheck";
import { DriverTrackMap, type TrackPoint } from "@/components/driver/DriverTrackMap";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import { CheckCircle, XCircle, Car } from "lucide-react";

export const Route = createFileRoute("/chauffeur/")({
  head: () => ({ meta: [{ title: "Chauffeur — MoveSpot" }, { name: "robots", content: "noindex" }] }),
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
  const { t } = Route.useSearch();
  const verify = useServerFn(verifyDriverToken);
  const pushBatch = useServerFn(pushPositionBatchWithToken);

  const [state, setState] = useState<"verifying" | "confirming" | "ready" | "invalid" | "tracking">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [lastPos, setLastPos] = useState<TrackPoint | null>(null);
  const [sessionTrack, setSessionTrack] = useState<TrackPoint[]>([]);

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
        // Étape de confirmation obligatoire avant le GPS
        setState("confirming");
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

  const confirmVehicle = () => {
    setState("ready");
    toast.success("Véhicule confirmé ✓");
  };

  const rejectVehicle = () => {
    // Efface le token mémorisé pour forcer un nouveau scan
    try { localStorage.removeItem("movespot_driver_token"); } catch {}
    setState("invalid");
    setError("Mauvais véhicule signalé. Scannez le QR du bon véhicule ou contactez votre responsable.");
  };

  const start = async () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }
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
    toast.success("Suivi GPS démarré");
  };

  const stop = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    if (wakeLockRef.current) { try { wakeLockRef.current.release(); } catch {} }
    wakeLockRef.current = null;
    void bufferRef.current?.stop().then(() => setPending(bufferRef.current?.pending ?? 0));
    setSessionTrack([]);
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

        {/* ── Étape de confirmation du véhicule ── */}
        {state === "confirming" && vehicle && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Confirmez votre véhicule</span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-semibold">{vehicle.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span>{vehicle.type}</span>
                </div>
                {vehicle.format && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format pub</span>
                    <span>{vehicle.format}</span>
                  </div>
                )}
                {vehicle.plate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Immatriculation</span>
                    <span className="font-mono font-bold tracking-wider">{vehicle.plate}</span>
                  </div>
                )}
                {vehicle.zones.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zone(s)</span>
                    <span className="text-right">{vehicle.zones.join(", ")}</span>
                  </div>
                )}
              </div>

              <p className="text-sm font-medium text-center mb-4">
                Êtes-vous bien dans ce véhicule ?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={rejectVehicle}
                  className="flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive py-3 text-sm font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Non, mauvais véhicule
                </button>
                <button
                  onClick={confirmVehicle}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Oui, c'est le mien
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Cette vérification garantit que vos positions GPS sont bien rattachées au bon véhicule et à la bonne campagne.
            </p>
          </div>
        )}

        {/* ── Suivi GPS (ready + tracking) ── */}
        {(state === "ready" || state === "tracking") && vehicle && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Véhicule confirmé</div>
              <div className="font-display text-xl font-bold mt-1">{vehicle.name}</div>
              <div className="text-sm text-muted-foreground">
                {vehicle.type}{vehicle.format ? ` · ${vehicle.format}` : ""}
                {vehicle.plate && <span className="ml-2 font-mono font-bold">{vehicle.plate}</span>}
              </div>
              {vehicle.zones.length > 0 && (
                <div className="mt-3 text-left">
                  <WeatherInstallCheck zone={vehicle.zones[0]!} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">🗺️ Trafic :</span>
                    {(() => {
                      const q = encodeURIComponent(vehicle.zones[0]!);
                      return (
                        <>
                          <a href={`https://waze.com/ul?q=${q}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary">Waze</a>
                          <a href={`https://maps.google.com/maps?q=${q}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs font-medium hover:bg-secondary">Google Maps</a>
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
                <DriverTrackMap
                  currentPos={lastPos}
                  track={sessionTrack}
                  zones={vehicle.zones}
                />
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
