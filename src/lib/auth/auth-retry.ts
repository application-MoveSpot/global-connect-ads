const SERVICE_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "fetch failed",
  "load failed",
  "connection refused",
  "service unavailable",
  "etimedout",
  "econnreset",
  "err_network",
  "timeout",
];

export function isServiceUnavailable(
  error: { message?: string; status?: number } | null
): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    SERVICE_PATTERNS.some((p) => msg.includes(p)) ||
    (typeof error.status === "number" && [0, 503, 504].includes(error.status))
  );
}

type ErrorLike = { message?: string; status?: number } | null;
type SupabaseResult = { data: unknown; error: unknown };

/**
 * Wraps a Supabase auth call with automatic retry on transient service errors.
 * Retries up to maxAttempts times with exponential backoff (1s, 2s, 4s, 8s).
 * Credential errors (wrong password etc.) are never retried.
 */
export async function withAuthRetry<TResult extends SupabaseResult>(
  fn: () => Promise<TResult>,
  opts: {
    maxAttempts?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<TResult & { wasServiceError: boolean }> {
  const { maxAttempts = 4, onRetry } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn();
    const err = result.error as ErrorLike;
    if (!err) {
      return { ...result, wasServiceError: false };
    }
    if (!isServiceUnavailable(err) || attempt === maxAttempts) {
      return { ...result, wasServiceError: isServiceUnavailable(err) };
    }
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // 1s, 2s, 4s, 8s
    onRetry?.(attempt);
    await new Promise((r) => setTimeout(r, delay));
  }

  // Unreachable, but TypeScript needs it
  return { ...(await fn()), wasServiceError: true };
}
