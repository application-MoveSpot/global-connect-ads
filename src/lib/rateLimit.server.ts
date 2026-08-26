import { getRequest } from "@tanstack/react-start/server";

// Module-scoped sliding-window rate limiter — best-effort per Cloudflare Worker isolate.
// For precise cross-instance limiting, configure Cloudflare Rate Limiting rules in the dashboard.
const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  { maxRequests = 10, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {},
): boolean {
  const now = Date.now();
  const prev = windows.get(key) ?? [];
  const current = prev.filter((t) => now - t < windowMs);
  if (current.length >= maxRequests) return false;
  current.push(now);
  windows.set(key, current);
  // Evict oldest key when map grows large to bound memory use
  if (windows.size > 20_000) {
    const [oldest] = windows.keys();
    windows.delete(oldest);
  }
  return true;
}

export function getRequestIp(): string {
  try {
    const req = getRequest();
    return (
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export function assertRateLimit(
  key: string,
  opts?: { maxRequests?: number; windowMs?: number },
): void {
  if (!checkRateLimit(key, opts)) {
    throw new Error("Trop de requêtes. Réessayez dans quelques minutes.");
  }
}
