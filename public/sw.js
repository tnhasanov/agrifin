// Sahədə internet tez-tez kəsilir: tətbiq qabığı keşdən açılır.
// Hava məlumatının öz keşi var (src/services/weather.js), burada saxlanmır.
const CACHE = "agrifin-v1";
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Kənar sorğular (Open-Meteo, şriftlər) brauzerin öz keşinə buraxılır
  if (url.origin !== self.location.origin) return;

  // Naviqasiya: şəbəkə birinci, oflayn olsa qabıq keşdən
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  // Statik fayllar hash-lənib — keş birinci
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
