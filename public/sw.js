/**
 * Service Worker for Antrean Charger Sepeda Listrik & Gadai
 * Handles PWA offline caching (Offline-First App Shell), auto-update lifecycle,
 * and persistent Lock Screen Live Monitor notifications.
 */

const APP_VERSION = '1.4.0';
const CACHE_NAME = `ebike-charger-v${APP_VERSION}`;
const NOTIFICATION_TAG = 'active-charger-slots';

// Core static assets for instant offline cold boot in warehouse
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge old version caches
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

/**
 * Fetch Strategy:
 * 1. version.json -> Network first, fallback to cache
 * 2. Navigation / HTML -> Network first, fallback to cached /index.html
 * 3. Static assets (.js, .css, .svg, .png, etc.) -> Cache first, fallback to network and cache
 * 4. Third-party API (Supabase) -> Network only (handled by Local-First storage & Outbox Queue)
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET requests and external Supabase API / WebSockets
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Version check: Network first
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 2. Navigation (Page reload or opening app in offline warehouse)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // 3. Static Assets: Stale-While-Revalidate / Cache First
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch((err) => {
          // If offline and request is for an image / asset
          console.warn('Asset fetch failed offline:', req.url);
          throw err;
        });
    })
  );
});

// Listen to messages from main app thread
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'UPDATE_LOCKSCREEN_NOTIFICATION') {
    const { title, body, icon, badge, dataPayload } = data;
    event.waitUntil(
      self.registration.showNotification(title || '⚡ Antrean Charger Sepeda Listrik', {
        body: body || '',
        tag: NOTIFICATION_TAG,
        renotify: false,
        icon: icon || '/vite.svg',
        badge: badge || '/vite.svg',
        silent: true,
        data: dataPayload || { url: '/' }
      })
    );
  } else if (data.type === 'CLEAR_LOCKSCREEN_NOTIFICATION') {
    event.waitUntil(
      self.registration.getNotifications({ tag: NOTIFICATION_TAG }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      })
    );
  }
});

// Handle clicking on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
