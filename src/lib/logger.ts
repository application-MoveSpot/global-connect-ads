/** Structured JSON logger for server-side events (Cloudflare Workers / TanStack Start). */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  ts: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, event: string, extra: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...extra,
  };
  // JSON.stringify stays on one line → grep-friendly in Cloudflare log tails
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export const log = {
  info: (event: string, extra?: Record<string, unknown>) => emit("info", event, extra),
  warn: (event: string, extra?: Record<string, unknown>) => emit("warn", event, extra),
  error: (event: string, err: unknown, extra?: Record<string, unknown>) => {
    const errObj =
      err instanceof Error
        ? {
            msg: err.message,
            code: (err as NodeJS.ErrnoException).code ?? null,
            stack: err.stack?.split("\n")[1]?.trim() ?? null,
          }
        : { msg: String(err) };
    emit("error", event, { ...errObj, ...extra });
  },
};

/**
 * Wraps a fetch-based async function with structured ECONNRESET logging and
 * optional retry (exponential backoff, only on network-level errors).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { event: string; maxRetries?: number } = { event: "fetch" },
): Promise<T> {
  const { event, maxRetries = 2 } = opts;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const code = err instanceof Error ? ((err as NodeJS.ErrnoException).code ?? "") : "";
      const retryable = [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "UND_ERR_SOCKET",
      ].includes(code);
      attempt++;
      if (!retryable || attempt > maxRetries) {
        log.error(event, err, { attempt, retryable: false });
        throw err;
      }
      const delay = 200 * 2 ** (attempt - 1); // 200ms, 400ms
      log.warn(`${event}_retry`, { code, attempt, delay_ms: delay });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
