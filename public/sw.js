/// <reference lib="webworker" />
/* global self, caches */

const SHELL_CACHE = "jep-shell-v1";
const IMAGE_CACHE = "jep-images-v1";
const EXPECTED_CACHES = [SHELL_CACHE, IMAGE_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !EXPECTED_CACHES.includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first for Vite-hashed assets, fonts, and sounds
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/sounds/")
  ) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
    return;
  }

  // Cache-first for clue images from allowed domains
  if (isAllowedImageDomain(url)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  // Network-first for solo game and profile HTML (navigation requests)
  if (event.request.mode === "navigate" && isOfflinePage(url)) {
    event.respondWith(networkFirst(event.request, SHELL_CACHE));
    return;
  }

  // Everything else: passthrough
});

function isOfflinePage(url) {
  return (
    /^\/game\/[^/]+\/solo$/.test(url.pathname) || url.pathname === "/profile"
  );
}

function isAllowedImageDomain(url) {
  return (
    url.hostname === "www.j-archive.com" ||
    url.hostname === "upload.wikimedia.org"
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("Offline and no cached version available", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
