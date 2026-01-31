/**
 * Service Worker for Session Timer PWA
 * Provides offline functionality and caching
 */

// Version constant - update this to bust cache when app updates
const APP_VERSION = '2.2.4';
const CACHE_NAME = `sessiontimer-v${APP_VERSION}`;
const STATIC_CACHE_URLS = [
  './',
  './timer.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // Force activation
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method !== 'GET') {
    return; // Only handle GET requests
  }
  
  // Handle settings.json with network-first strategy
  if (url.pathname.includes('settings.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response before caching
          const responseClone = response.clone();
          
          // Cache the fresh response
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_URLS.some(url => request.url.includes(url))) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then(response => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              // Cache the response
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseToCache));
              
              return response;
            });
        })
    );
    return;
  }
  
  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => {
        // Network failed, try cache
        return caches.match(request);
      })
  );
});

// Handle background sync for offline timer events (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'timer-sync') {
    console.log('Service Worker: Background sync triggered');
    // Could implement offline timer completion tracking here
  }
});

// Handle push notifications (future enhancement)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Timer notification',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'timer-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open Timer'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Session Timer', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          // Try to focus existing window
          for (const client of clientList) {
            if (client.url.includes('timer.html') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow('./timer.html');
          }
        })
    );
  }
});

console.log('Service Worker: Loaded');
