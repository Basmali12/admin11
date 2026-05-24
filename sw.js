const CACHE_NAME = 'app-cache-v2';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

const externalIcons = [
  'https://raw.githubusercontent.com/mdn/pwa-examples/main/a2hs/images/icon-192.png',
  'https://raw.githubusercontent.com/mdn/pwa-examples/main/a2hs/images/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // تخزين الملفات المحلية
      try { await cache.addAll(urlsToCache); } catch(e) { console.log(e); }
      
      // تخزين الصور الخارجية لمعالجة CORS
      for (const url of externalIcons) {
        try {
          const response = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, response);
        } catch (err) {
          console.error('Fetch external failed:', url, err);
        }
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => fetch(event.request))
  );
});
