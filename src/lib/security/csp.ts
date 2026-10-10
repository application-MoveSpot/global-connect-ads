// Content Security Policy for MoveSpot
//
// WHY unsafe-inline + unsafe-eval:
//   - React 19 hydration injects inline scripts during SSR
//   - Tailwind CSS generates inline styles at build time
//   - Mapbox GL uses dynamic Function() for WebGL shader compilation
//
// The real XSS protection here comes from restricting connect-src to known
// origins (blocks data exfiltration to attacker-controlled servers), locking
// frame-ancestors to prevent clickjacking, and object-src 'none' to block
// plugin-based injection.

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.stripe.com connect.facebook.net www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net",
  "font-src 'self' fonts.gstatic.com data:",
  "img-src 'self' data: blob: *.supabase.co *.mapbox.com *.openstreetmap.org cdn.jsdelivr.net www.facebook.com www.google.com googleads.g.doubleclick.net",
  [
    "connect-src 'self'",
    "*.supabase.co",
    "wss://*.supabase.co",
    "*.stripe.com",
    "api.mapbox.com",
    "events.mapbox.com",
    "*.mapbox.com",
    "*.sentry.io",
    "www.facebook.com",
    "www.googletagmanager.com",
    "www.google-analytics.com",
    "nominatim.openstreetmap.org",
    "router.project-osrm.org",
  ].join(" "),
  "frame-src 'self' js.stripe.com hooks.stripe.com checkout.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' *.stripe.com",
] as const;

export const CSP_HEADER = CSP_DIRECTIVES.join("; ");
