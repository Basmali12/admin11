const CACHE_NAME = 'app-cache-v1';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  'https://raw.githubusercontent.com/mdn/pwa-examples/main/a2hs/images/icon-192.png',
  'https://raw.githubusercontent.com/mdn/pwa-examples/main/a2hs/images/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => {
          if (url.startsWith('http')) {
            // معالجة الروابط الخارجية لتفادي أخطاء CORS
            return fetch(url, { mode: 'no-cors' })
              .then(response => cache.put(url, response))
              .catch(err => console.error('Fetch external failed:', url, err));
          } else {
            return cache.add(url).catch(err => console.error('Cache add failed:', url, err));
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
