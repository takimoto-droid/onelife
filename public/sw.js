// Service Worker for わんサポ notifications

const CACHE_NAME = 'wansapo-v1';

// インストール時
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

// アクティベート時
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

// プッシュ通知受信時
self.addEventListener('push', (event) => {
  console.log('Push notification received.');

  let data = {
    title: 'わんサポ',
    body: '通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'open',
        title: '確認する',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked.');
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // なければ新規ウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNotifications());
  }
});

async function checkForNotifications() {
  try {
    const response = await fetch('/api/notifications/check');
    const data = await response.json();

    if (data.notifications && data.notifications.length > 0) {
      for (const notification of data.notifications) {
        await self.registration.showNotification(notification.title, {
          body: notification.body,
          icon: '/icon-192.png',
          data: { url: notification.url },
        });
      }
    }
  } catch (error) {
    console.error('Failed to check notifications:', error);
  }
}
