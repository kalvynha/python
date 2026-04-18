// Minimal service worker — just enough to make the app installable as
// a PWA. No aggressive caching because the app is auth-gated and needs
// fresh Firestore + API responses. An offline fallback can be added
// later if we want to support read-only modes.

const CACHE = "qlc-shell-v1";
const SHELL = ["/", "/logo.png", "/logo.svg", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Network-first for navigation so we always get the freshest app
// shell; fall back to cache if offline. Everything else (API, assets)
// passes through untouched.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode !== "navigate") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(async () => (await caches.match(req)) ?? (await caches.match("/")))
  );
});
