/**
 * Server-side Sentry error capture for Cloudflare Workers / TanStack Start.
 *
 * @sentry/react is browser-only. This module posts to the Sentry HTTP Store API
 * using fetch — no extra package required, compatible with the edge runtime.
 * Errors are reported fire-and-forget so they never block the response.
 */

interface ParsedDsn {
  key: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\//, "");
    if (!key || !host || !projectId) return null;
    return { key, host, projectId };
  } catch {
    return null;
  }
}

function getDsn(): ParsedDsn | null {
  const raw =
    process.env["SENTRY_DSN"] ??
    process.env["VITE_SENTRY_DSN"] ??
    "https://c7b5ce73e73720021857f434b4f4584b@o4511980174573568.ingest.de.sentry.io/4511980224446544";
  return parseDsn(raw);
}

type SentryLevel = "fatal" | "error" | "warning" | "info" | "debug";

interface CaptureOptions {
  /** Sentry tag category — used for alert rules. */
  category?: "ai" | "payment" | "auth" | "api" | "infra";
  extra?: Record<string, unknown>;
  userId?: string;
  level?: SentryLevel;
}

/**
 * Report an error from a server function to Sentry.
 * Safe to call in any async context — never throws, never awaited.
 */
export function captureServerException(error: unknown, opts: CaptureOptions = {}): void {
  const dsn = getDsn();
  if (!dsn) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const { category = "api", extra, userId, level = "error" } = opts;

  const event: Record<string, unknown> = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level,
    environment: process.env["NODE_ENV"] ?? "production",
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim() })),
              }
            : undefined,
        },
      ],
    },
    tags: { category },
    ...(extra ? { extra } : {}),
    ...(userId ? { user: { id: userId } } : {}),
  };

  void fetch(`https://${dsn.host}/api/${dsn.projectId}/store/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7,sentry_client=movespot-server,sentry_key=${dsn.key}`,
    },
    body: JSON.stringify(event),
  }).catch(() => {
    // Silently drop — logging infra must never break the app
  });
}

/**
 * Wraps an async function so any unhandled exception is reported to Sentry
 * before being re-thrown. Use inside createServerFn handlers:
 *
 *   .handler(({ data, context }) =>
 *     withSentryCapture(() => myLogic(data, context), "payment", { userId: context.userId })
 *   )
 */
export function withSentryCapture<T>(
  fn: () => Promise<T>,
  category: CaptureOptions["category"] = "api",
  opts: Omit<CaptureOptions, "category"> = {},
): Promise<T> {
  return fn().catch((err: unknown) => {
    captureServerException(err, { category, ...opts });
    throw err;
  });
}
