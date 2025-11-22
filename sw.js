// Service Worker for The Last Soldier PWA
const CACHE_NAME = 'the-last-soldier-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/base.css',
  '/css/hud.css',
  '/css/loading.css',
  '/css/menu-about.css',
  '/css/menu-base.css',
  '/css/menu-battlefield.css',
  '/css/menu-customize.css',
  '/css/menu-main.css',
  '/css/menu-play-mode.css',
  '/css/menu-settings.css',
  '/css/responsive.css',
  '/src/main.js',
  '/lib/three/build/three.module.js',
  '/lib/three/examples/jsm/libs/stats.module.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[Service Worker] Failed to cache some assets:', err);
          // Don't fail installation if some assets fail to cache
          return Promise.resolve();
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Strategy: Cache First for static assets, Network First for dynamic content
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request).then((response) => {
        // Don't cache non-GET requests or non-successful responses
        if (request.method !== 'GET' || !response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache dynamic content in runtime cache
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If network fails and it's a navigation request, return offline page
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

