const READER_GALLERY_CACHE = 'kaliyona-gallery-v1';

const PRECACHE_GALLERY_URLS = [
  '/reader/menu1.jpg',
  '/reader/menu2.jpg',
  '/reader/bmtc-board.jpg',
  '/reader/metro-notice.jpg',
  '/reader/auto-stand.jpg',
  '/reader/street-sign.jpg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(READER_GALLERY_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_GALLERY_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignore optional precache failures during install
          }
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k.startsWith('kaliyona-tessdata-') ||
                (k.startsWith('kaliyona-gallery-') && k !== READER_GALLERY_CACHE)
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first strategy for Guided Gallery offline photo assets (/reader/*)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (!url.pathname.startsWith('/reader/')) return;

  event.respondWith(
    caches.open(READER_GALLERY_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
  );
});
