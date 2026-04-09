// Stancard Service Worker — shell + market data offline caching
const SHELL_CACHE = 'stancard-shell-v1';
const DATA_CACHE  = 'stancard-data-v1';

// App shell assets to precache on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls (with data cache fallback),
//        cache-first for shell assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Market data API calls — network first, fall back to data cache
  const isMarketApi =
    url.hostname.includes('financialmodelingprep.com') ||
    url.hostname.includes('newsapi.org') ||
    (url.pathname.includes('/api/v2/') && url.hostname === self.location.hostname);

  if (isMarketApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // IC canister API calls — always network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // App shell — cache first, fall back to network, fall back to index.html
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

// Listen for messages from the app to cache market data explicitly
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MARKET_DATA') {
    const { key, data } = event.data;
    caches.open(DATA_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put(key, response);
    });
  }
});

// ── Web Push: show notification when an alert triggers ──
// Expected payload: { title: string, body: string, url: string }
self.addEventListener('push', (event) => {
  let payload = { title: 'Stancard Alert', body: 'A price alert was triggered.', url: '/' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: 'stancard-alert',
      renotify: true,
      data: { url: payload.url || '/' },
    })
  );
});

// ── Notification click: open or focus the app ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing window if one is open
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
