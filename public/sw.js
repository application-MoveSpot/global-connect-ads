const CACHE = "movespot-v1";

const PRECACHE = [
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/camion-led.webp",
];

// Installe et pré-cache les assets essentiels
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

// Supprime les anciens caches au démarrage
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== "GET") return;

  // Ignorer les requêtes cross-origin (Supabase, Stripe, Mapbox, AI SDK…)
  if (url.origin !== self.location.origin) return;

  // Ignorer les routes serveur et API
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/__") ||
    url.pathname.startsWith("/.well-known/")
  )
    return;

  // Assets statiques (JS, CSS, images, fonts) → cache-first
  if (/\.(js|css|png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|otf)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Navigation → network-first (SSR), fallback page hors-ligne minimaliste
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          caches.match(request) ??
          new Response(
            `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>MoveSpot — Hors ligne</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}
.box{text-align:center;padding:2rem}h1{font-size:2rem;margin-bottom:.5rem}p{color:#94a3b8}</style></head>
<body><div class="box"><h1>📡 Hors ligne</h1>
<p>Vérifiez votre connexion internet et réessayez.</p></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
    return;
  }
});
