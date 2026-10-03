// WatchPointPro service worker: lets the app open without signal.
//  - App files (/_next/static, icons) never change once built, so they're kept after first use.
//  - Home-check pages are loaded fresh whenever there's a connection and a copy is kept, so a check
//    already opened on this phone can be reopened offline (its edits sync when back online).
//  - Any other page shows /offline.html when there's no connection.
const VERSION = "v1";
const STATIC = `wpp-static-${VERSION}`;
const PAGES = `wpp-pages-${VERSION}`;

const isStatic = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
const isCheckPage = (url) => /^\/dashboard\/homewatcher\/inspections\/[a-z0-9]+$/.test(url.pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.add("/offline.html"))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("wpp-") && key !== STATIC && key !== PAGES) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isCheckPage(url) && response.ok && !response.redirected) {
            const cache = await caches.open(PAGES);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          const saved = isCheckPage(url) ? await caches.match(request) : undefined;
          return saved ?? (await caches.match("/offline.html"));
        }
      })(),
    );
  }
});

// Signing out removes saved pages, so the next person on this phone can't open them offline.
self.addEventListener("message", (event) => {
  if (event.data === "sign-out") event.waitUntil(caches.delete(PAGES));
});
