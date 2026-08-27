import * as Sentry from "@sentry/react";

const DSN = import.meta.env["VITE_SENTRY_DSN"] as string | undefined;

export function initSentry() {
  if (!DSN || typeof window === "undefined") return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env["VITE_APP_VERSION"] as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
    ],
  });
}

export { Sentry };
