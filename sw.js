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
      // نستخدم Promise.all لضمان تخزين كل ملف على حدة 
      // بدون no-cors لأن الروابط تدعم مشاركة الموارد (CORS)
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.error('Cache add failed for:', url, err));
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
