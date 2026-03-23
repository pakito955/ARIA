const CACHE_NAME = 'aria-v2'
const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf']

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API calls — always network, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline', cached: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Static assets (images, fonts) — cache first, network fallback
  const isStaticAsset = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML pages & JS/CSS — network first, cache fallback (offline only)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'ARIA', {
      body: data.body || 'New message requires your attention',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'aria-notification',
      data: { url: data.url || '/dashboard/inbox' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/dashboard'
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
