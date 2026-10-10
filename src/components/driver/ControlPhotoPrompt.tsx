import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDriverControlPhotoRequest,
  submitControlPhoto,
} from "@/lib/tracking/control-photo";

type Props = {
  vehicleId: string;
  /** Intervalle de polling en ms (défaut : 60 s) */
  pollIntervalMs?: number;
};

type RequestState =
  | { phase: "idle" }
  | { phase: "pending"; requestId: string; deadlineAt: string }
  | { phase: "uploading" }
  | { phase: "done"; success: boolean; message: string };

function formatCountdown(deadlineAt: string): string {
  const ms = new Date(deadlineAt).getTime() - Date.now();
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ControlPhotoPrompt({ vehicleId, pollIntervalMs = 60_000 }: Props) {
  const [state, setState] = useState<RequestState>({ phase: "idle" });
  const [countdown, setCountdown] = useState<string>("05:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRequest = useServerFn(getDriverControlPhotoRequest);
  const uploadPhoto = useServerFn(submitControlPhoto);

  const checkForRequest = useCallback(async () => {
    try {
      const res = await fetchRequest({ data: { vehicleId } });
      if (res.request) {
        setState({
          phase: "pending",
          requestId: res.request.id,
          deadlineAt: res.request.deadline_at,
        });
      } else if (state.phase === "pending") {
        // Demande disparue (expirée côté serveur)
        setState({ phase: "done", success: false, message: "Délai expiré. Cette demande a été marquée comme non-répondue." });
      }
    } catch {
      // erreur réseau — on réessaie au prochain tick
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, fetchRequest]);

  // Polling
  useEffect(() => {
    void checkForRequest();
    pollRef.current = setInterval(checkForRequest, pollIntervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkForRequest, pollIntervalMs]);

  // Countdown ticker
  useEffect(() => {
    if (state.phase !== "pending") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    const { deadlineAt } = state;
    setCountdown(formatCountdown(deadlineAt));
    tickRef.current = setInterval(() => {
      const c = formatCountdown(deadlineAt);
      setCountdown(c);
      if (c === "00:00") {
        setState({ phase: "done", success: false, message: "Délai expiré." });
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (state.phase !== "pending") return;
      const file = e.target.files?.[0];
      if (!file) return;

      setState({ phase: "uploading" });

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Retire le préfixe data:...;base64,
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Géolocalisation au moment de la prise de vue
        let lat: number | null = null;
        let lng: number | null = null;
        let accuracy: number | null = null;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, {
              enableHighAccuracy: true,
              timeout: 5000,
            }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
        } catch {
          // GPS non disponible — on envoie quand même (flag no_gps côté serveur)
        }

        const mimeType = (
          file.type === "image/png"
            ? "image/png"
            : file.type === "image/webp"
              ? "image/webp"
              : "image/jpeg"
        ) as "image/jpeg" | "image/png" | "image/webp";

        await uploadPhoto({
          data: {
            requestId: (state as { requestId: string }).requestId,
            photo: base64,
            photoMimeType: mimeType,
            lat,
            lng,
            accuracy,
          },
        });

        setState({
          phase: "done",
          success: true,
          message: "Photo envoyée. Merci !",
        });
      } catch (err) {
        setState({
          phase: "done",
          success: false,
          message: err instanceof Error ? err.message : "Erreur lors de l'envoi.",
        });
      }
    },
    [state, uploadPhoto],
  );

  if (state.phase === "idle") return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3",
        "border",
        state.phase === "uploading" || state.phase === "pending"
          ? "bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700"
          : state.phase === "done" && state.success
            ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700"
            : "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700",
      )}
      role="alertdialog"
      aria-live="assertive"
    >
      {state.phase === "pending" && (
        <>
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <Camera className="w-5 h-5 shrink-0" />
            <span>Photo de contrôle demandée</span>
            <span className="ml-auto font-mono text-lg tabular-nums">{countdown}</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            MoveSpot demande une photo de votre véhicule dans les prochaines minutes.
            Prenez une photo montrant clairement le véhicule et la publicité apposée.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Prendre / choisir une photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {state.phase === "uploading" && (
        <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
          <Clock className="w-5 h-5 animate-pulse shrink-0" />
          <span className="font-medium">Envoi en cours…</span>
        </div>
      )}

      {state.phase === "done" && (
        <div className="flex items-center gap-3">
          {state.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <p
            className={cn(
              "text-sm font-medium",
              state.success
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300",
            )}
          >
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => setState({ phase: "idle" })}
            className="ml-auto text-xs underline opacity-60 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
