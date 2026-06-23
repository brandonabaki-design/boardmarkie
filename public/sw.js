// Boardmarkie service worker — makes the app installable and usable offline
// (so saved lessons can be opened/presented without a connection).
//
// Strategy: network-first for page navigations (always fresh when online,
// cached copy when offline); cache-first for static assets (Next's hashed
// _next/static files are immutable). Cross-origin requests — the image/AI proxy
// and Openverse/Giphy/YouTube hosts — are left untouched so they never get
// stale or wrongly cached.

const CACHE = "boardmarkie-v1";
const SCOPE_PATH = new URL(self.registration.scope).pathname; // "/" or "/boardmarkie/"

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave proxy / CDNs / image hosts alone

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match(SCOPE_PATH)) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok && fresh.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
