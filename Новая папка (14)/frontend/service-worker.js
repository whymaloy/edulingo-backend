const CACHE_NAME = 'edulingo-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './teacher-dashboard.html',
  './student-dashboard.html',
  './css/style.css',
  './css/dashboard.css',
  './js/api.js',
  './js/auth.js',
  './js/teacher.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // If offline and request fails, try to return index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      }
    )
  );
});
