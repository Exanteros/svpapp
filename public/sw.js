const CACHE_NAME = 'svp-turnier-v1';
const urlsToCache = [
  '/',
  '/spielplan',
  '/ergebnisse',
  '/anmeldung',
  '/manifest.json',
  // Add important CSS and JS files
  '/_next/static/css/app/layout.css',
  // Add offline fallback page
  '/offline'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching files');
        return cache.addAll(urlsToCache.map(url => new Request(url, {credentials: 'same-origin'})));
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip cross-origin requests (unless they're API calls)
  if (url.origin !== location.origin && !url.pathname.startsWith('/api/')) {
    return;
  }

  // Never cache admin routes - always fetch fresh
  if (url.pathname.startsWith('/admin')) {
    console.log('🚫 Service Worker: Skipping cache for admin route', request.url);
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('📦 Service Worker: Serving from cache', request.url);
          return response;
        }

        // For API calls, try network first
        if (url.pathname.startsWith('/api/')) {
          // Never cache admin API calls
          if (url.pathname.startsWith('/api/admin')) {
            console.log('🚫 Service Worker: Skipping cache for admin API', request.url);
            return fetch(request);
          }

          return fetch(request)
            .then((response) => {
              // Don't cache failed API responses
              if (!response || response.status !== 200) {
                return response;
              }

              // Clone the response for caching
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // Return cached API response if available
              return caches.match(request);
            });
        }

        // For other requests, try network first, fallback to cache
        return fetch(request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails, try to serve from cache
            return caches.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  return cachedResponse;
                }
                
                // If no cache available, serve offline page for navigation requests
                if (request.mode === 'navigate') {
                  return caches.match('/offline');
                }
                
                // Return a basic offline response for other requests
                return new Response('Offline - Keine Internetverbindung', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          });
      })
  );
});

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle background sync for offline form submissions
  // This could include syncing team registrations, helper signups, etc.
  console.log('⏫ Service Worker: Performing background sync');
}

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('📱 Service Worker: Push notification received', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore', 
          title: 'Turnier öffnen',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close', 
          title: 'Schließen',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked', event);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/spielplan'));
  }
});

console.log('🎯 Service Worker: Loaded successfully');
