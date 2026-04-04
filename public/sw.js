/**
 * Eaglestone Field CRM — Service Worker
 *
 * Cache strategies:
 *   - CacheFirst  → static assets (JS, CSS, fonts, images)
 *   - NetworkFirst → API routes (/api/**)
 *
 * Background sync tags:
 *   - 'sync-visits'
 *   - 'sync-customers'
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `eaglestone-static-${CACHE_VERSION}`;
const API_CACHE     = `eaglestone-api-${CACHE_VERSION}`;

/** URLs pre-cached on SW install (app shell). */
const APP_SHELL_URLS = [
  '/',
  '/login',
  '/offline',
];

// ---------------------------------------------------------------------------
// Install — pre-cache the app shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate — purge stale caches from previous versions
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([STATIC_CACHE, API_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch — route requests to the appropriate cache strategy
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests (skip cross-origin analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests for caching (mutations use background sync instead)
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Background Sync — replay queued mutations from IndexedDB
// ---------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-visits') {
    event.waitUntil(replayQueue('pending-visits'));
  } else if (event.tag === 'sync-customers') {
    event.waitUntil(replayQueue('pending-customers'));
  }
});

// ---------------------------------------------------------------------------
// Cache strategy helpers
// ---------------------------------------------------------------------------

/**
 * NetworkFirst: try the network; fall back to cache on failure.
 * Caches successful GET responses for future offline use.
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * CacheFirst: serve from cache if available; otherwise fetch and cache.
 *
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return offlineFallback(request);
  }
}

/**
 * Return the cached '/' shell for navigation requests, or a bare 503 for
 * everything else.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function offlineFallback(request) {
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache    = await caches.open(STATIC_CACHE);
    const fallback = await cache.match('/') ?? await cache.match('/offline');
    if (fallback) return fallback;
  }

  return new Response(
    JSON.stringify({ error: 'You are offline. Please reconnect and try again.' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ---------------------------------------------------------------------------
// IndexedDB helpers (duplicated in SW scope — no module imports allowed)
// ---------------------------------------------------------------------------

const IDB_NAME    = 'eaglestone-offline';
const IDB_VERSION = 1;

/** @returns {Promise<IDBDatabase>} */
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const stores = [
        'pending-visits',
        'pending-customers',
        'cached-customers',
        'cached-inventory',
      ];
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Read all items from a pending queue store.
 *
 * @param {IDBDatabase} db
 * @param {string}      storeName
 * @returns {Promise<Array>}
 */
function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readonly');
    const store   = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Delete a single item from a store by its key.
 *
 * @param {IDBDatabase} db
 * @param {string}      storeName
 * @param {string}      id
 * @returns {Promise<void>}
 */
function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Background sync — replay a pending queue
// ---------------------------------------------------------------------------

/**
 * Replay all queued mutations in `storeName` against the API.
 * Successful items are removed from the queue; failed items are kept for the
 * next sync attempt.
 *
 * @param {string} storeName  e.g. 'pending-visits'
 * @returns {Promise<void>}
 */
async function replayQueue(storeName) {
  const db    = await openIDB();
  const items = await getAllFromStore(db, storeName);

  if (items.length === 0) return;

  // Derive the API endpoint from the store name.
  // 'pending-visits'    → '/api/visits'
  // 'pending-customers' → '/api/customers'
  const resource  = storeName.replace('pending-', '');
  const endpoint  = `/api/${resource}`;

  await Promise.allSettled(
    items
      .filter((item) => !item.synced)
      .map(async (item) => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            await deleteFromStore(db, storeName, item.id);

            // Notify all open clients that an item was synced.
            const clients = await self.clients.matchAll({ type: 'window' });
            for (const client of clients) {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                storeName,
                itemId: item.id,
              });
            }
          }
          // Non-2xx responses are left in the queue for the next sync cycle.
        } catch {
          // Network still unavailable — leave item in queue.
        }
      })
  );
}
