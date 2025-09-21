const CACHE_NAME = 'makeprogress-v1';
const CORE_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/assets/goalflow-icon.png'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching core resources');
        return cache.addAll(CORE_CACHE_URLS.map(url => {
          return new Request(url, {cache: 'reload'});
        }));
      })
      .catch((error) => {
        console.log('SW: Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - runtime caching strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Skip caching for API requests to prevent data leakage between users
  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Network-first strategy for HTML pages
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return fetch(event.request)
            .then((response) => {
              // Cache successful HTML responses
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => {
              // Fallback to cached homepage for navigation requests
              return caches.match('/');
            });
        }

        // Cache-first strategy for static assets (JS, CSS, images)
        if (requestUrl.pathname.startsWith('/assets/') || 
            event.request.destination === 'script' ||
            event.request.destination === 'style' ||
            event.request.destination === 'image') {
          
          return fetch(event.request)
            .then((response) => {
              // Cache successful static asset responses
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
            })
            .catch(() => {
              // Return cached version if network fails
              return caches.match(event.request);
            });
        }

        // For all other requests, try network first
        return fetch(event.request);
      })
  );
});

// Handle background sync for offline goal updates (placeholder)
self.addEventListener('sync', (event) => {
  if (event.tag === 'goal-sync') {
    event.waitUntil(syncGoals());
  }
});

async function syncGoals() {
  try {
    // Placeholder for offline sync functionality
    console.log('SW: Background sync for goals');
  } catch (error) {
    console.log('SW: Background sync failed:', error);
  }
}

// Handle push notifications (placeholder for future implementation)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Time to check your goals progress!',
    icon: '/assets/goalflow-icon.png',
    badge: '/assets/goalflow-icon.png',
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('makeprogress Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});