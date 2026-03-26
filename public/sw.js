const SHELL_CACHE = 'aria-shell-v1'
const STATIC_CACHE = 'aria-static-v1'
const STATS_CACHE = 'aria-stats-v1'
const STATS_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
const SYNC_QUEUE_KEY = 'aria-offline-queue'

// Shell pages to precache for offline support
const SHELL_URLS = ['/', '/dashboard', '/dashboard/inbox']

// ── Install: precache shell HTML ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {}) // non-fatal — may not be deployed yet
    )
  )
})

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, STATIC_CACHE, STATS_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch routing ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // RULE: Never cache /api/emails or /api/ai/* (dynamic content)
  if (
    url.pathname.startsWith('/api/emails') ||
    url.pathname.startsWith('/api/ai/')
  ) {
    event.respondWith(fetch(request))
    return
  }

  // Stale-while-revalidate for /api/stats (5-min cache)
  if (url.pathname === '/api/stats') {
    event.respondWith(staleWhileRevalidate(request, STATS_CACHE, STATS_MAX_AGE_MS))
    return
  }

  // RULE: Never cache other /api/ routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Cache-first for images and fonts (long-lived assets)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/fonts/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Network-first for HTML, JS, CSS (handles navigations + Next.js chunks)
  event.respondWith(networkFirst(request))
})

// ── Background Sync: offline email actions ────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'aria-email-actions') {
    event.waitUntil(flushOfflineQueue())
  }
})

// ── Push notifications (web push) ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = { title: 'ARIA', body: 'New notification' }
  try { payload = event.data.json() } catch { payload.body = event.data.text() }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'aria-notification',
      renotify: true,
      data: payload,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return client.focus()
        }
        return self.clients.openWindow('/dashboard/inbox')
      })
  )
})

// ── Message handler: page → SW communication ─────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'QUEUE_ACTION') {
    enqueueAction(event.data.action).then(() => {
      if ('sync' in self.registration) {
        self.registration.sync.register('aria-email-actions').catch(() => {})
      }
    })
  }
})

// ── Strategy helpers ──────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await caches.match(request)
    return cached ?? Response.error()
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    return Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const isFresh =
    cachedResponse &&
    Date.now() - new Date(cachedResponse.headers.get('date') ?? 0).getTime() < maxAgeMs

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) cache.put(request, networkResponse.clone())
      return networkResponse
    })
    .catch(() => null)

  if (isFresh) {
    fetchPromise // background revalidate (fire-and-forget)
    return cachedResponse
  }

  const networkResponse = await fetchPromise
  return networkResponse ?? cachedResponse ?? Response.error()
}

// ── Offline queue (IndexedDB backed) ─────────────────────────────────────────

async function enqueueAction(action) {
  const queue = await getQueue()
  queue.push({ ...action, queuedAt: Date.now() })
  await saveQueue(queue)
}

async function flushOfflineQueue() {
  const queue = await getQueue()
  if (!queue.length) return
  const remaining = []
  for (const action of queue) {
    try {
      const res = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      })
      if (!res.ok) remaining.push(action)
    } catch {
      remaining.push(action)
    }
  }
  await saveQueue(remaining)
}

async function getQueue() {
  try {
    const db = await openDb()
    return (await dbGet(db, SYNC_QUEUE_KEY)) ?? []
  } catch { return [] }
}

async function saveQueue(queue) {
  try {
    const db = await openDb()
    await dbSet(db, SYNC_QUEUE_KEY, queue)
  } catch { /* IndexedDB unavailable — acceptable */ }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aria-sw', 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('kv')
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function dbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly')
    const req = tx.objectStore('kv').get(key)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

function dbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    const req = tx.objectStore('kv').put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}
