/**
 * Service Worker for Antrean Charger Sepeda Listrik & Gadai
 * Handles PWA auto-update lifecycle and persistent Lock Screen Live Monitor notifications.
 */

const APP_VERSION = '1.2.0';
const CACHE_NAME = `ebike-charger-${APP_VERSION}`;
const NOTIFICATION_TAG = 'active-charger-slots';

self.addEventListener('install', (event) => {
  // Activate immediately so new updates take effect quickly
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge old caches
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
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
