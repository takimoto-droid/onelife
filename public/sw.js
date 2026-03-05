// Service Worker for わんライフ PWA
const CACHE_NAME = 'wanlife-v1';
const STATIC_CACHE = 'wanlife-static-v1';
const DYNAMIC_CACHE = 'wanlife-dynamic-v1';

// 静的アセット（必ずキャッシュ）
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon.svg',
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベート時（古いキャッシュを削除）
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// フェッチ時
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 同一オリジンのみ処理
  if (url.origin !== location.origin) return;

  // APIリクエストはネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静的アセットはキャッシュ優先
  if (request.destination === 'image' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ページはネットワーク優先、オフライン時はキャッシュ
  event.respondWith(networkFirst(request));
});

// キャッシュ優先戦略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// ネットワーク優先戦略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // オフラインページを返す
    if (request.destination === 'document') {
      return new Response(
        `<!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>オフライン - わんライフ</title>
          <style>
            body {
              font-family: 'Hiragino Sans', sans-serif;
              background: linear-gradient(180deg, #FFF9F5 0%, #FFF5F5 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              color: #5D4037;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #8D6E63; margin-bottom: 1.5rem; }
            button {
              background: linear-gradient(135deg, #FF8585, #FFB5B5);
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 9999px;
              font-weight: bold;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>オフラインです</h1>
            <p>インターネット接続を確認してください</p>
            <button onclick="location.reload()">再読み込み</button>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

// プッシュ通知受信
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = { title: 'わんライフ', body: '新しいお知らせがあります' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: '開く' },
      { action: 'close', title: '閉じる' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
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
          icon: '/icons/icon-192.png',
          data: { url: notification.url },
        });
      }
    }
  } catch (error) {
    console.error('[SW] Failed to check notifications:', error);
  }
}
