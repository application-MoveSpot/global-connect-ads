import * as Sentry from "@sentry/react";

const DSN =
  (import.meta.env["VITE_SENTRY_DSN"] as string | undefined) ||
  "https://c7b5ce73e73720021857f434b4f4584b@o4511980174573568.ingest.de.sentry.io/4511980224446544";

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

/** Capture an error with a category tag so Sentry alert rules can filter by flow. */
export function captureError(
  error: unknown,
  category: "payment" | "upload" | "auth" | "api",
  extras?: Record<string, unknown>,
) {
  Sentry.captureException(error, {
    tags: { category },
    extra: extras,
  });
}
