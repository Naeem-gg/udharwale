/* Udharwale PWA service worker — static shell only (safe for Next App Router). */
const CACHE_VERSION = 'udharwale-shell-v2';
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/udharwale-192.png',
  '/icons/udharwale-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon' ||
    url.pathname === '/icon.png' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API / auth / RSC-ish traffic.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-State-Tree')
  ) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Warm the shell cache when online.
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/', copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match('/')) ||
            (await cache.match('/offline.html')) ||
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        })
    );
  }
});
