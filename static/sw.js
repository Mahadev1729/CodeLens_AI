/* =====================================================
   AI Codebase Mentor — Service Worker (sw.js)
   Provides offline caching & install support for PWA
   ===================================================== */

const CACHE_NAME = 'codementor-ai-v1';
const STATIC_ASSETS = [
  '/',
  '/app/static/manifest.json',
  '/app/static/icons/icon-192.png',
  '/app/static/icons/icon-512.png',
];

// ── Install: cache static assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Non-fatal: assets may not all be available at install time
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ──────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests for same-origin or static assets
  if (request.method !== 'GET') return;

  // For Streamlit's WebSocket/SSE — always pass through to network
  if (
    request.url.includes('/_stcore/') ||
    request.url.includes('/stream') ||
    request.url.includes('websocket')
  ) {
    return;
  }

  // Static assets: cache-first
  if (
    request.url.includes('/app/static/') ||
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
