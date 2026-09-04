/**
 * Service Worker 2.0 for NaEtacie PWA with Advanced Offline GIS & Vector Tile Caching.
 * Provides offline caching for application shell, static assets, announcements,
 * and vector tiles/styles (CartoDB, MapLibre GL, ArcGIS Satellite) for Szczecin.
 */

const CACHE_NAME = 'naetacie-v2';
const TILE_CACHE_NAME = 'naetacie-tiles-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
];

// Domains hosting vector basemaps, glyphs, and satellite tiles
const GIS_HOSTS = [
  'basemaps.cartocdn.com',
  'server.arcgisonline.com',
  'demotiles.maplibre.org',
  'fonts.openmaptiles.org',
  'unpkg.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Vector Map Tiles & GIS Styles Caching (Stale-While-Revalidate / Cache-First)
  const isGisRequest = GIS_HOSTS.some((host) => url.hostname.includes(host));
  if (isGisRequest) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((tileCache) => {
        return tileCache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                tileCache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          // Return cached response immediately if available, refresh in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Announcements & Internal API (Network-First with Cache Fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Static Assets & App Shell (Cache-First)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// 4. Mobile Push Notifications Integration (Nowe zlecenia budowlane Szczecin)
self.addEventListener('push', (event) => {
  let data = {
    title: 'NaEtacie: Nowe zlecenia w Szczecinie',
    body: 'Pojawiły się nowe oferty pracy budowlanej w Twojej okolicy!',
    icon: '/icons/icon-192.png',
    badge: '/favicon.ico',
    url: '/?tab=map',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open_map', title: 'Otwórz na mapie 3D' },
      { action: 'open_list', title: 'Zobacz listę' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = event.notification.data?.url || '/';

  if (event.action === 'open_map') {
    targetUrl = '/?tab=map';
  } else if (event.action === 'open_list') {
    targetUrl = '/?tab=list';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

