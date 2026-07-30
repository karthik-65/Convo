// Service Worker for Convo Web Notifications (Mobile & Desktop)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification click event (brings user back to chat window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Handle incoming background push notifications (if Web Push API payload received)
self.addEventListener('push', (event) => {
  let data = { title: 'Convo', body: 'New message received', icon: '/chat.png' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/chat.png',
    badge: '/chat.png',
    vibrate: [120, 80, 120],
    tag: 'convo-notification',
    renotify: true,
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Convo', options)
  );
});
