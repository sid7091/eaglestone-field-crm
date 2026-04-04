/**
 * offline-store.ts
 *
 * Thin IndexedDB wrapper for Eaglestone Field CRM offline storage.
 * Uses the raw IDB API — no third-party dependencies.
 *
 * Object stores
 * ─────────────
 *   pending-visits     — mutations queued while offline
 *   pending-customers  — mutations queued while offline
 *   cached-customers   — read-through cache for customer list
 *   cached-inventory   — read-through cache for inventory list
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingStoreName =
  | 'pending-visits'
  | 'pending-customers';

export type CacheStoreName =
  | 'cached-customers'
  | 'cached-inventory';

export type StoreName = PendingStoreName | CacheStoreName;

/** A mutation that has been queued for later synchronisation. */
export interface PendingItem<T = unknown> {
  /** UUID v4 — used as the IDB record key. */
  id: string;
  /** The original request payload. */
  data: T;
  /** ISO-8601 timestamp of when the item was enqueued. */
  createdAt: string;
  /** Flipped to `true` once the item has been successfully synced. */
  synced: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME    = 'eaglestone-offline' as const;
const DB_VERSION = 1 as const;

const ALL_STORES: readonly StoreName[] = [
  'pending-visits',
  'pending-customers',
  'cached-customers',
  'cached-inventory',
];

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------

let _db: IDBDatabase | null = null;

/**
 * Open (or reuse) the IndexedDB database.
 * Creates all required object stores on first run / version upgrade.
 */
export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      for (const storeName of ALL_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = (event: Event) => {
      _db = (event.target as IDBOpenDBRequest).result;

      // If the connection is closed externally (e.g. version bump), clear the
      // cached reference so the next call re-opens it.
      _db.onclose = () => { _db = null; };

      resolve(_db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('IndexedDB open request was blocked by an existing connection.'));
  });
}

// ---------------------------------------------------------------------------
// UUID helper (no dependency on `crypto.randomUUID` being available everywhere)
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: RFC 4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Pending queue — write operations
// ---------------------------------------------------------------------------

/**
 * Enqueue a mutation payload for later synchronisation.
 *
 * @param storeName  The pending queue to write to.
 * @param data       The request payload (will be stored as-is).
 * @returns          The newly created {@link PendingItem}.
 */
export async function addToPendingQueue<T = unknown>(
  storeName: PendingStoreName,
  data: T
): Promise<PendingItem<T>> {
  const db = await openDB();

  const item: PendingItem<T> = {
    id:        generateId(),
    data,
    createdAt: new Date().toISOString(),
    synced:    false,
  };

  return new Promise<PendingItem<T>>((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readwrite');
    const store   = tx.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(item);
    request.onerror   = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Pending queue — read operations
// ---------------------------------------------------------------------------

/**
 * Retrieve all items from a pending queue (synced and un-synced).
 *
 * @param storeName  The pending queue to read from.
 */
export async function getPendingItems<T = unknown>(
  storeName: PendingStoreName
): Promise<PendingItem<T>[]> {
  const db = await openDB();

  return new Promise<PendingItem<T>[]>((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readonly');
    const store   = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () =>
      resolve(request.result as PendingItem<T>[]);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Pending queue — clear
// ---------------------------------------------------------------------------

/**
 * Remove all records from a pending queue (called after successful sync).
 *
 * @param storeName  The pending queue to clear.
 */
export async function clearPendingItems(
  storeName: PendingStoreName
): Promise<void> {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readwrite');
    const store   = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror   = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Read-through cache — write
// ---------------------------------------------------------------------------

/**
 * Persist an array of items into a read-through cache store.
 * The store is cleared first so stale records are not retained.
 *
 * @param storeName  Target cache store.
 * @param items      Array of objects to cache. Each must include an `id` field.
 */
export async function cacheData<T extends { id: string }>(
  storeName: CacheStoreName,
  items: T[]
): Promise<void> {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Wipe stale data before writing the fresh snapshot.
    store.clear();

    for (const item of items) {
      store.put(item);
    }

    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Read-through cache — read
// ---------------------------------------------------------------------------

/**
 * Retrieve all cached items from a cache store.
 *
 * @param storeName  The cache store to read from.
 * @returns          Cached items, or an empty array if the cache is cold.
 */
export async function getCachedData<T = unknown>(
  storeName: CacheStoreName
): Promise<T[]> {
  const db = await openDB();

  return new Promise<T[]>((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readonly');
    const store   = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror   = () => reject(request.error);
  });
}
