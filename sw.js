/**
 * sw.js — Skin Ritual · Service Worker
 * Network-first for JS/HTML — always serves fresh code.
 * Cache-first for images/fonts.
 */

const CACHE_NAME = 'skin-ritual-v3';
const BASE       = '/SkinRoutine';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('anthropic.com')) return;
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) return;

  const isCode = /\.(js|html)(\?|$)/.test(event.request.url);

  event.respondWith(
    isCode
      // Network-first: always try fresh, fallback to cache
      ? fetch(event.request)
          .then(r => { caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone())); return r; })
          .catch(() => caches.match(event.request))
      // Cache-first: images, css, icons
      : caches.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(r => {
            if (r.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
            return r;
          });
        })
  );
});
