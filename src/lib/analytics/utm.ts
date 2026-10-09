const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"] as const;
type UtmKey = (typeof UTM_KEYS)[number];
export type UtmData = Partial<Record<UtmKey, string>>;

const STORAGE_KEY = "movespot_utm";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type UtmEntry = { data: UtmData; capturedAt: number };

/** Read UTMs from current URL and persist them to localStorage (first-touch model). */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fresh: UtmData = {};
    for (const key of UTM_KEYS) {
      const v = params.get(key);
      if (v) fresh[key] = v;
    }
    // Only write if this visit has UTM params (first-touch: don't overwrite existing)
    if (Object.keys(fresh).length === 0) return;
    const existing = getStoredUtmEntry();
    if (existing) return; // keep first-touch attribution
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: fresh, capturedAt: Date.now() } satisfies UtmEntry));
  } catch {
    // localStorage may be blocked in some contexts
  }
}

function getStoredUtmEntry(): UtmEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as UtmEntry;
    if (Date.now() - entry.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

/** Return stored UTM data if still within the 30-day window, otherwise null. */
export function getStoredUtm(): UtmData | null {
  return getStoredUtmEntry()?.data ?? null;
}

/** Clear stored UTM — call after a conversion (signup, first campaign) if desired. */
export function clearStoredUtm(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
