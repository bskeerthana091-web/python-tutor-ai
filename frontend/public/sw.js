// PyAI Tutor - Cache Eviction Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Pass all requests directly through to network without caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
