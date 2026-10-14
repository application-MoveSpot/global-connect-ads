// Rotate the cache so installed apps discard previously stored branding assets.
const CACHE = "movespot-official-logo-v2";
const PRECACHE = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.origin !== self.location.origin ||
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase")
  )
    return;

  // Static assets — cache-first
  if (/\.(png|ico|webp|svg|woff2?|css|js)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Navigation — network-first, cache as fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request)),
    );
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "MoveSpot";
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag ?? "movespot",
    data: { url: data.url ?? "/" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    }),
  );
});
