const CACHE_NAME = "noovs-terminal-v1";
const APP_SHELL = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Announcements come from a published Google Sheet and should
  // always be fresh — never served from cache, only fall back to
  // it if the network is unreachable.
  if (
    url.hostname.includes("docs.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
    return;
  }

  // Everything else (the page shell): serve from cache first so the
  // site still opens offline, and refresh the cache in the background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
