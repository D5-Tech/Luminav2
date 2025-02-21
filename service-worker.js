// service-worker.js
const CACHE_NAME = 'luminav-v3';
const OFFLINE_URL = '/offline.html';
const OFFLINE_IMG = '/images/offline-map.png';

const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
  '/images/offline-map.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Cache versioning and dynamic cache
const DYNAMIC_CACHE = 'dynamic-v1';
const TILE_CACHE = 'map-tiles-v1';

// Helper function for network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match(OFFLINE_URL);
  }
}

// Helper for map tiles caching
async function cacheMapTile(request) {
  const cache = await caches.open(TILE_CACHE);
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      {
        headers: { 'Content-Type': 'image/png' }
      }
    );
  }
}

// Install event with pre-caching
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event with cache cleanup
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('luminav-') && 
              cacheName !== CACHE_NAME
            )
            .map(cacheName => caches.delete(cacheName))
        );
      })
    ])
  );
});

// Fetch event with improved strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle map tile requests
  if (url.href.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheMapTile(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;

        return fetch(request).then(response => {
          // Cache successful responses
          if (response.ok && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, responseToCache));
          }
          return response;
        }).catch(() => {
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          // Return offline image for image requests
          if (request.destination === 'image') {
            return caches.match(OFFLINE_IMG);
          }
          return null;
        });
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(
      // Handle form data sync
      self.registration.storage.get('offline-forms')
        .then(forms => {
          return Promise.all(forms.map(form => 
            fetch('/api/submit-form', {
              method: 'POST',
              body: JSON.stringify(form)
            })
          ));
        })
        .then(() => self.registration.storage.delete('offline-forms'))
    );
  }
});

// Push notification handling
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Luminav Update', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});