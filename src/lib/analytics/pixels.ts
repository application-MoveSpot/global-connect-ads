/**
 * Pixel retargeting — Meta (Facebook) + Google Ads.
 *
 * RGPD/CNIL: pixels are loaded and fired ONLY when the visitor has accepted
 * cookies. We listen to the `ms-consent-change` CustomEvent dispatched by
 * `src/lib/consent.ts` to catch late consent (banner accept after load).
 *
 * Usage:
 *   initPixels()         — call once on app mount (in __root.tsx)
 *   firePixelEvent(…)    — call at conversion points
 */

import { getConsent } from "@/lib/consent";

declare global {
  interface Window {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    fbq?: (method: string, ...args: any[]) => void;
    _fbq?: unknown;
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GADS_ID = import.meta.env.VITE_GADS_ID as string | undefined;
const GADS_REGISTRATION_LABEL = import.meta.env.VITE_GADS_REGISTRATION_LABEL as string | undefined;

export type PixelEvent =
  "PageView" | "Lead" | "CompleteRegistration" | "Purchase" | "InitiateCheckout" | "ViewContent";

export type PixelEventData = Record<string, unknown>;

let metaLoaded = false;
let gadsLoaded = false;

function loadMetaPixel(id: string): void {
  if (metaLoaded || typeof window === "undefined") return;
  metaLoaded = true;

  // Minimal Meta Pixel stub — mirrors the official base code
  if (!window.fbq) {
    const q: unknown[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fbq: any = function (method: string, ...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(method, ...args);
      else q.push([method, ...args]);
    };
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = q;
    window.fbq = fbq as typeof window.fbq;
    window._fbq = fbq;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq?.("init", id);
}

function loadGoogleAds(id: string): void {
  if (gadsLoaded || typeof window === "undefined") return;
  gadsLoaded = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (...args: unknown[]) {
    (window.dataLayer as unknown[]).push(args);
  };
  window.gtag("js", new Date());
  // send_page_view: false — we fire PageView manually so it respects consent timing
  window.gtag("config", id, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function loadPixels(): void {
  if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID);
  if (GADS_ID) loadGoogleAds(GADS_ID);
}

/** Fire a pixel event to all loaded/consented providers. No-op if consent refused or pixels not configured. */
export function firePixelEvent(event: PixelEvent, data?: PixelEventData): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "accepted") return;

  // Meta Pixel
  if (window.fbq) {
    window.fbq("track", event, data ?? {});
  }

  // Google Ads
  if (window.gtag && GADS_ID) {
    switch (event) {
      case "PageView":
        window.gtag("event", "page_view", { send_to: GADS_ID });
        break;
      case "CompleteRegistration":
        if (GADS_REGISTRATION_LABEL) {
          window.gtag("event", "conversion", {
            send_to: `${GADS_ID}/${GADS_REGISTRATION_LABEL}`,
            ...data,
          });
        }
        break;
      case "Purchase":
        window.gtag("event", "purchase", {
          send_to: GADS_ID,
          currency: "EUR",
          ...data,
        });
        break;
      case "Lead":
        window.gtag("event", "generate_lead", { send_to: GADS_ID, ...data });
        break;
      case "InitiateCheckout":
        window.gtag("event", "begin_checkout", { send_to: GADS_ID, ...data });
        break;
      case "ViewContent":
        window.gtag("event", "view_item", { send_to: GADS_ID, ...data });
        break;
    }
  }
}

/**
 * Call once on app mount. Loads pixel scripts immediately if consent was already
 * given, otherwise defers until the visitor accepts via the cookie banner.
 */
export function initPixels(): void {
  if (typeof window === "undefined") return;

  if (getConsent() === "accepted") {
    loadPixels();
    return;
  }

  // Late consent: visitor accepts after the page loads
  const onConsentChange = (e: Event) => {
    const detail = (e as CustomEvent<string | null>).detail;
    if (detail === "accepted") {
      loadPixels();
      // Retroactively fire PageView for the current page
      firePixelEvent("PageView");
    }
  };

  window.addEventListener("ms-consent-change", onConsentChange, { once: true });
}
