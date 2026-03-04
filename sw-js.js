const CACHE_NAME = 'skin-ritual-v4';

const ASSETS = [
  '/SkinRoutine/',
  '/SkinRoutine/index.html',
  '/SkinRoutine/manifest.json',
  '/SkinRoutine/icons/icon-192.png',
  '/SkinRoutine/icons/icon-512.png'
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first, then network
self.addEventListener('fetch', event => {
  // Only handle GET requests on our scope
  if (event.request.method !== 'GET') return;
  if (!event.request.url.includes('/SkinRoutine/')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
            return response;
          })
          .catch(() => caches.match('/SkinRoutine/index.html'));
      })
  );
});
