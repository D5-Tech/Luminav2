// service-worker.js
const CACHE_NAME = 'luminav-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/busStop/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
// Helper function to determine if a request should be cached
const shouldCache = (url) => {
  // Don't cache third-party requests that might cause CORS issues
  if (url.includes('dlnk.one')) {
    return false;
  }
  
  // Cache your app's resources and OpenStreetMap tiles
  return url.includes(self.location.origin) || 
         url.includes('tile.openstreetmap.org') ||
         url.includes('unpkg.com/leaflet') ||
         url.includes('cdnjs.cloudflare.com/ajax/libs/font-awesome');
};

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event with improved error handling
self.addEventListener('fetch', event => {
  // Check if this is a request that might cause CORS issues
  const url = event.request.url;
  
  // Handle potentially problematic requests
  if (url.includes('dlnk.one')) {
    // Return an empty JSON response
    event.respondWith(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }
  
  // For all other requests, try the cache first
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
           // Check if we received a valid response
if (!response || response.status !== 200) {
  // Don't cache non-successful responses
  return response;
}

// For cross-origin resources like CDN files, we can still cache if they're in our allowlist
if (response.type !== 'basic' && !shouldCache(url)) {
  return response;
}
            
            // If this is a resource we want to cache
            if (shouldCache(url)) {
              // Clone the response because it can only be used once
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // For OpenStreetMap tiles, try to return a placeholder image
            if (url.includes('tile.openstreetmap.org')) {
              return new Response(
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 
                { status: 200, headers: { 'Content-Type': 'image/png' } }
              );
            }
            
            // For CSS files, return minimal CSS
            if (url.endsWith('.css')) {
              return new Response(
                'body{font-family:system-ui;background:#f0f0f0;}', 
                { status: 200, headers: { 'Content-Type': 'text/css' } }
              );
            }
            
            // For JavaScript files, return empty JS object
            if (url.endsWith('.js')) {
              return new Response(
                '{}', 
                { status: 200, headers: { 'Content-Type': 'application/javascript' } }
              );
            }
          });

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});