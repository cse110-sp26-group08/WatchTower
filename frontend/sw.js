const CACHE_NAME = 'watchtower-static-v1';

const STATIC_ASSETS = [
  '/',
  '/login.html',
  '/signup.html',
  '/app_selection.html',
  '/dashboard.html',
  '/styling/homepage.css',
  '/styling/login.css',
  '/styling/signup.css',
  '/styling/app_selection.css',
  '/styling/dashboard.css',
  '/js/login.js',
  '/js/signup.js',
  '/js/app_selection.js',
  '/js/graphs.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) =>
      cachedResponse || fetch(event.request)
    )
  );
});