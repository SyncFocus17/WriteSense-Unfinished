const CACHE_NAME = 'writesense-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/normalize.css',
  '/css/main.css',
  '/css/editor.css',
  '/js/app.js',
  '/js/editor.js',
  '/js/ai-assistant.js',
  '/js/collaboration.js',
  '/images/logo.svg',
  // Add other assets
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
