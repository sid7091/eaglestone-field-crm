/**
 * sync-manager.ts
 *
 * Service Worker registration, connectivity detection, and background sync
 * orchestration for Eaglestone Field CRM.
 *
 * All functions are safe to call in SSR contexts — they no-op when
 * `window` / `navigator` are unavailable.
 */

import {
  openDB,
  getPendingItems,
  clearPendingItems,
  type PendingStoreName,
} from './offline-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback invoked whenever the device goes online or offline. */
export type ConnectivityCallback = (online: boolean) => void;

/** Cleanup function returned by {@link onConnectivityChange}. */
export type UnsubscribeFn = () => void;

// ---------------------------------------------------------------------------
// Service Worker registration
// ---------------------------------------------------------------------------

/**
 * Register the service worker at `/sw.js`.
 *
 * - Handles first-time installation silently.
 * - Prompts the user (via console + custom event) when a new SW is waiting.
 * - Safe to call multiple times — subsequent calls are no-ops.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // A new SW finished installing — tell the app so it can show a "reload"
    // banner if desired.
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New content is available. Dispatch a custom event so UI layers
          // can surface a "reload for new version" prompt.
          window.dispatchEvent(new CustomEvent('sw-update-available'));
          console.info('[SW] New version available — reload to update.');
        }
      });
    });

    console.info('[SW] Registered successfully.');
  } catch (error) {
    console.error('[SW] Registration failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Background sync
// ---------------------------------------------------------------------------

/**
 * Register a Background Sync tag with the active service worker.
 *
 * Falls back gracefully when the Background Sync API is not available
 * (e.g. Firefox, Safari < 16.4) by immediately calling {@link syncPendingData}.
 *
 * @param tag  e.g. `'sync-visits'` or `'sync-customers'`
 */
export async function requestBackgroundSync(tag: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      // Cast required because the BackgroundSync API types are not in the
      // default TS lib — they live in @types/service_worker_api.
      await (registration as ServiceWorkerRegistration & {
        sync: { register(tag: string): Promise<void> };
      }).sync.register(tag);

      console.info(`[Sync] Background sync registered: ${tag}`);
    } else {
      // Background Sync not supported — attempt an immediate sync instead.
      console.warn('[Sync] Background Sync API not supported; attempting immediate sync.');
      await syncPendingData();
    }
  } catch (error) {
    console.error('[Sync] Failed to register background sync:', error);
    // Best-effort immediate sync as a last resort.
    await syncPendingData();
  }
}

// ---------------------------------------------------------------------------
// Connectivity helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the browser reports that it has a network connection.
 *
 * Note: `navigator.onLine === true` does **not** guarantee internet access;
 * it only means the device is not definitively offline.
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true; // assume online in SSR
  return navigator.onLine;
}

/**
 * Subscribe to online / offline transitions.
 *
 * The callback is invoked immediately with the current state, then again
 * whenever connectivity changes.
 *
 * @param callback  Receives `true` when online, `false` when offline.
 * @returns         A cleanup function that removes the event listeners.
 *
 * @example
 * const unsubscribe = onConnectivityChange((online) => {
 *   setIsOnline(online);
 * });
 * // Later:
 * unsubscribe();
 */
export function onConnectivityChange(
  callback: ConnectivityCallback
): UnsubscribeFn {
  if (typeof window === 'undefined') {
    // SSR — return a no-op cleanup
    return () => undefined;
  }

  const handleOnline  = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online',  handleOnline);
  window.addEventListener('offline', handleOffline);

  // Notify caller of the current state immediately.
  callback(navigator.onLine);

  return () => {
    window.removeEventListener('online',  handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ---------------------------------------------------------------------------
// Pending queue synchronisation
// ---------------------------------------------------------------------------

/** Maps pending-queue store names to their API endpoints. */
const STORE_ENDPOINT_MAP: Record<PendingStoreName, string> = {
  'pending-visits':    '/api/visits',
  'pending-customers': '/api/customers',
};

/**
 * Pull all un-synced items from every pending queue in IndexedDB, POST them
 * to their respective API endpoints, and clear the queue on success.
 *
 * Individual store failures are caught and logged so that a failure in one
 * store does not prevent other stores from syncing.
 *
 * This function is a no-op when called server-side.
 */
export async function syncPendingData(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isOnline()) {
    console.info('[Sync] Device is offline — skipping sync.');
    return;
  }

  // Ensure the DB is open before we start (surfaces schema errors early).
  await openDB();

  const stores = Object.keys(STORE_ENDPOINT_MAP) as PendingStoreName[];

  await Promise.allSettled(
    stores.map((storeName) => syncStore(storeName))
  );
}

/**
 * Sync a single pending queue store.
 *
 * @param storeName  The IDB store to drain.
 */
async function syncStore(storeName: PendingStoreName): Promise<void> {
  const endpoint = STORE_ENDPOINT_MAP[storeName];
  const items    = await getPendingItems(storeName);
  const pending  = items.filter((item) => !item.synced);

  if (pending.length === 0) return;

  console.info(`[Sync] Syncing ${pending.length} item(s) from "${storeName}"…`);

  const results = await Promise.allSettled(
    pending.map(async (item) => {
      const response = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item.data),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `[Sync] POST ${endpoint} failed with ${response.status}: ${text}`
        );
      }

      return item.id;
    })
  );

  const allSucceeded = results.every((r) => r.status === 'fulfilled');

  // Only clear the queue when every item succeeded so that partial failures
  // are retried on the next sync cycle.
  if (allSucceeded) {
    await clearPendingItems(storeName);
    console.info(`[Sync] "${storeName}" synced and cleared.`);
  } else {
    const failures = results.filter((r) => r.status === 'rejected').length;
    console.warn(
      `[Sync] "${storeName}": ${pending.length - failures} succeeded, ${failures} failed — queue retained for retry.`
    );
  }
}
