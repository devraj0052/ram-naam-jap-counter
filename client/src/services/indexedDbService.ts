/**
 * IndexedDB Persistent Storage Service for Shri Ram Naam Jap Counter
 * 
 * Provides offline-first persistence for:
 * 1. Sync Queue: Pending count events waiting for server confirmation
 * 2. History Events: Granular timestamped Ram Naam jap entries with sync status
 * 3. Daily Stats: Aggregated daily counts and malas
 * 4. App State: Authoritative cached counts, guest data, and preferences
 */

import { CountEvent, DailyStat } from '../types/shared';

const DB_NAME = 'RamNaamJapDB';
const DB_VERSION = 1;

export class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isSupported) {
      this.initDb();
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Sync Queue Store (Unsynced count events)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'clientEventId' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('synced', 'synced', { unique: false });
        }

        // 2. Granular History Events Store (Full date + time audit trail)
        if (!db.objectStoreNames.contains('history_events')) {
          const historyStore = db.createObjectStore('history_events', { keyPath: 'clientEventId' });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('synced', 'synced', { unique: false });
        }

        // 3. Daily Stats Store
        if (!db.objectStoreNames.contains('daily_stats')) {
          db.createObjectStore('daily_stats', { keyPath: 'date' });
        }

        // 4. Key-Value App State Store
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('[IndexedDB] Failed to open database, falling back to localStorage:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // ---------------------------------------------------------------------------
  // Sync Queue Methods
  // ---------------------------------------------------------------------------

  public async enqueueEvent(event: CountEvent): Promise<void> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['sync_queue', 'history_events'], 'readwrite');
        
        // Put in sync queue
        tx.objectStore('sync_queue').put(event);
        
        // Also put in history events as unconfirmed/local
        tx.objectStore('history_events').put({
          ...event,
          synced: false,
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback to localStorage
      this.fallbackEnqueue(event);
    }
  }

  public async getPendingQueue(): Promise<CountEvent[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallbackGetPendingQueue();
    }
  }

  public async removeProcessedFromQueue(clientEventIds: string[]): Promise<void> {
    if (!clientEventIds || clientEventIds.length === 0) return;

    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['sync_queue', 'history_events'], 'readwrite');
        const queueStore = tx.objectStore('sync_queue');
        const historyStore = tx.objectStore('history_events');

        clientEventIds.forEach((id) => {
          queueStore.delete(id);

          // Update sync status to true in history store
          const getReq = historyStore.get(id);
          getReq.onsuccess = () => {
            if (getReq.result) {
              const updated = { ...getReq.result, synced: true, serverConfirmedAt: Date.now() };
              historyStore.put(updated);
            }
          };
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.fallbackRemoveProcessed(clientEventIds);
    }
  }

  public async clearQueue(): Promise<void> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      localStorage.removeItem('ramjap_pending_events');
    }
  }

  // ---------------------------------------------------------------------------
  // History Audit Trail Methods
  // ---------------------------------------------------------------------------

  public async saveHistoryEvents(events: CountEvent[]): Promise<void> {
    if (!events || events.length === 0) return;
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history_events', 'readwrite');
        const store = tx.objectStore('history_events');
        events.forEach((evt) => {
          store.put(evt);
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async getAllHistoryEvents(): Promise<CountEvent[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history_events', 'readonly');
        const store = tx.objectStore('history_events');
        const index = store.index('timestamp');
        const req = index.openCursor(null, 'prev'); // Newest first

        const results: CountEvent[] = [];
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Daily Stats Methods
  // ---------------------------------------------------------------------------

  public async saveDailyStats(stats: DailyStat[]): Promise<void> {
    if (!stats || stats.length === 0) return;
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('daily_stats', 'readwrite');
        const store = tx.objectStore('daily_stats');
        stats.forEach((s) => store.put(s));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  public async getAllDailyStats(): Promise<DailyStat[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('daily_stats', 'readonly');
        const store = tx.objectStore('daily_stats');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as DailyStat[];
          list.sort((a, b) => b.date.localeCompare(a.date)); // Descending by date
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Generic Key-Value App State Methods
  // ---------------------------------------------------------------------------

  public async setAppState(key: string, value: any): Promise<void> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('app_state', 'readwrite');
        tx.objectStore('app_state').put({ key, value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      try {
        localStorage.setItem(`ramjap_state_${key}`, JSON.stringify(value));
      } catch {}
    }
  }

  public async getAppState<T>(key: string, defaultVal: T): Promise<T> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction('app_state', 'readonly');
        const req = tx.objectStore('app_state').get(key);
        req.onsuccess = () => {
          if (req.result && req.result.value !== undefined) {
            resolve(req.result.value);
          } else {
            resolve(defaultVal);
          }
        };
        req.onerror = () => resolve(defaultVal);
      });
    } catch {
      try {
        const raw = localStorage.getItem(`ramjap_state_${key}`);
        return raw ? JSON.parse(raw) : defaultVal;
      } catch {
        return defaultVal;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LocalStorage Fallback Helpers (for browsers with IndexedDB restricted)
  // ---------------------------------------------------------------------------

  private fallbackEnqueue(event: CountEvent) {
    try {
      const queue = this.fallbackGetPendingQueue();
      queue.push(event);
      localStorage.setItem('ramjap_pending_events', JSON.stringify(queue));
    } catch {}
  }

  private fallbackGetPendingQueue(): CountEvent[] {
    try {
      const raw = localStorage.getItem('ramjap_pending_events');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private fallbackRemoveProcessed(clientEventIds: string[]) {
    try {
      const set = new Set(clientEventIds);
      const queue = this.fallbackGetPendingQueue().filter((e) => !set.has(e.clientEventId));
      localStorage.setItem('ramjap_pending_events', JSON.stringify(queue));
    } catch {}
  }
}

export const idbService = new IndexedDbService();
