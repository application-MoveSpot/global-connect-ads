import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

interface Alert {
  id: string;
  level: "info" | "warn" | "error";
  message?: string;
  messageKey?: string;
}

const DISMISS_KEY_PREFIX = "movespot_status_dismissed_";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

function isDismissed(id: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY_PREFIX + id);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss(id: string) {
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + id, String(Date.now()));
  } catch {
    // ignore
  }
}

const LEVEL_STYLES: Record<Alert["level"], string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBanner() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const discovered: Alert[] = [];

    // 1. WebGL support check (SSR-safe — only runs client-side)
    const webglId = "webgl_fallback";
    if (!isDismissed(webglId)) {
      import("mapbox-gl")
        .then((mod) => {
          const mapboxgl = mod.default ?? mod;
          if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: false })) {
            setAlerts((prev) => [
              ...prev,
              {
                id: webglId,
                level: "warn",
                messageKey: "status_banner.webgl_warn",
              },
            ]);
          }
        })
        .catch(() => {
          // mapbox-gl not loaded — silently ignore
        });
    }

    // 2. Optional incident message injected at build time (VITE_STATUS_MESSAGE)
    const incidentMsg = import.meta.env.VITE_STATUS_MESSAGE as string | undefined;
    const incidentId = "incident_msg";
    if (incidentMsg && incidentMsg.trim() && !isDismissed(incidentId)) {
      discovered.push({ id: incidentId, level: "warn", message: incidentMsg.trim() });
    }

    if (discovered.length) setAlerts((prev) => [...prev, ...discovered]);
  }, []);

  if (!alerts.length) return null;

  function close(id: string) {
    dismiss(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col gap-1 p-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="status"
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur-sm ${LEVEL_STYLES[alert.level]}`}
        >
          <span>{alert.messageKey ? t(alert.messageKey) : alert.message}</span>
          <button
            type="button"
            aria-label={t("status_banner.btn_close")}
            onClick={() => close(alert.id)}
            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
