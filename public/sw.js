const CACHE = 'editja-v1';
const PRECACHED = ['/', '/editor', '/library', '/import', '/viewer'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHED))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => new Response('Offline', { status: 503 })))
  );
});
