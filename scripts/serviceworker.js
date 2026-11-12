/* Scope-specific app shell. Weather responses are persisted separately by the app. */
const PREFIX =
  "weather-atlas:" + new URL(self.registration.scope).pathname + ":";
const CACHE = PREFIX + "__REVISION__";
const ASSETS = __ASSETS__;
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))),
);
self.addEventListener("message", (event) => {
  if (event.data === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith(PREFIX) && key !== CACHE) ||
                (new URL(self.registration.scope).pathname === "/" &&
                  key.startsWith("fs-meteo16-")),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const u = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    u.origin !== self.location.origin ||
    !u.pathname.startsWith(new URL(self.registration.scope).pathname)
  )
    return;
  const base = new URL(self.registration.scope).pathname;
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(base + "index.html")) || fetch(event.request),
        ),
    );
    return;
  }
  if (ASSETS.includes(u.pathname))
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(u.pathname)) || fetch(event.request),
        ),
    );
});
