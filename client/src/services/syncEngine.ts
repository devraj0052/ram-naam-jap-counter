import { api } from './api';
import { idbService } from './indexedDbService';
import {
  CountEvent,
  SyncState,
  SyncPullResponse,
  DayHistoryGroup,
  MonthlyStatsSummary,
  YearlyStatsSummary,
  DailyStat,
} from '../types/shared';

type SyncListener = (state: SyncState, lastSyncedAt: number | null) => void;
type DataListener = (data: Partial<SyncPullResponse>) => void;

class SyncEngine {
  private syncState: SyncState = 'guest';
  private lastSyncedAt: number | null = null;
  private pendingQueue: CountEvent[] = [];
  private syncDebounceTimer: any = null;
  private retryTimer: any = null;
  private retryAttempts: number = 0;
  private readonly maxRetryAttempts: number = 5;
  private isFlushing: boolean = false;
  private deviceId: string = '';
  private syncListeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDevice();
      this.loadQueue();
      this.setupNetworkAndWorkerListeners();
    }
  }

  private initDevice() {
    let dId = localStorage.getItem('ramjap_device_id');
    if (!dId) {
      dId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('ramjap_device_id', dId);
    }
    this.deviceId = dId;
  }

  private async loadQueue() {
    try {
      // 1. Load from IndexedDB
      const idbQueue = await idbService.getPendingQueue();
      
      // 2. Load any legacy localStorage queue and merge
      let lsQueue: CountEvent[] = [];
      const raw = localStorage.getItem('ramjap_pending_events');
      if (raw) {
        try {
          lsQueue = JSON.parse(raw);
        } catch {}
      }

      const map = new Map<string, CountEvent>();
      idbQueue.forEach((e) => map.set(e.clientEventId, e));
      lsQueue.forEach((e) => {
        if (!map.has(e.clientEventId)) {
          map.set(e.clientEventId, e);
          idbService.enqueueEvent(e).catch(() => {});
        }
      });

      this.pendingQueue = Array.from(map.values());
      this.saveLocalFallbackQueue();
    } catch {
      this.pendingQueue = [];
    }

    const token = api.getToken();
    if (!token) {
      this.syncState = 'guest';
    } else {
      this.syncState = navigator.onLine ? (this.pendingQueue.length > 0 ? 'syncing' : 'synced') : 'offline';
    }
    this.notifySync();

    // If online and authenticated with pending events, flush immediately
    if (token && navigator.onLine && this.pendingQueue.length > 0) {
      this.flushPending();
    }
  }

  private saveLocalFallbackQueue() {
    try {
      localStorage.setItem('ramjap_pending_events', JSON.stringify(this.pendingQueue));
    } catch {}
  }

  private setupNetworkAndWorkerListeners() {
    // 1. Network online event
    window.addEventListener('online', () => {
      console.log('[SyncEngine] 🌐 Network reconnected. Triggering automatic synchronization...');
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.retryAttempts = 0;
      if (api.getToken()) {
        this.syncState = 'syncing';
        this.notifySync();
        this.flushPending();
      } else {
        this.syncState = 'guest';
        this.notifySync();
      }
    });

    // 2. Network offline event
    window.addEventListener('offline', () => {
      console.log('[SyncEngine] 📴 Network offline. Operating in offline-first mode.');
      this.syncState = 'offline';
      this.notifySync();
    });

    // 3. App Visibility / Re-open event (reconnecting when user switches back to tab or app)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && api.getToken() && navigator.onLine) {
        this.flushPending();
      }
    });

    // 4. Background Sync message from Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'TRIGGER_BACKGROUND_SYNC') {
          console.log('[SyncEngine] ⚡ Background sync event received from Service Worker.');
          this.flushPending();
        }
      });
    }
  }

  // Register with Service Worker Background Sync API where supported (e.g. Android Chrome)
  private requestBackgroundSync() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then((reg: any) => {
          return reg.sync.register('ramjap-sync-queue');
        })
        .catch(() => {});
    }
  }

  public subscribeSync(fn: SyncListener): () => void {
    this.syncListeners.add(fn);
    fn(this.syncState, this.lastSyncedAt);
    return () => this.syncListeners.delete(fn);
  }

  public subscribeData(fn: DataListener): () => void {
    this.dataListeners.add(fn);
    return () => this.dataListeners.delete(fn);
  }

  private notifySync() {
    this.syncListeners.forEach((fn) => fn(this.syncState, this.lastSyncedAt));
  }

  private notifyData(data: Partial<SyncPullResponse>) {
    this.dataListeners.forEach((fn) => fn(data));
  }

  public getSyncState(): { state: SyncState; lastSyncedAt: number | null; pendingCount: number } {
    return {
      state: this.syncState,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: this.pendingQueue.length,
    };
  }

  // Record an instant count locally in IndexedDB with event idempotency
  public recordCount(delta: number = 1): { clientEventId: string; date: string; timestamp: number } {
    const todayStr = this.getTodayDateString();
    const timestamp = Date.now();
    const clientEventId = `${this.deviceId}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    const event: CountEvent = {
      id: clientEventId,
      clientEventId,
      delta,
      timestamp,
      date: todayStr,
      synced: false,
    };

    // 1. Persist directly to IndexedDB
    idbService.enqueueEvent(event).catch((err) => {
      console.warn('[SyncEngine] IDB enqueue error:', err);
    });

    const token = api.getToken();

    if (!token) {
      // Guest local storage & IDB counting
      this.recordGuestCount(delta, todayStr, event);
      this.syncState = 'guest';
      this.notifySync();
      return { clientEventId, date: todayStr, timestamp };
    }

    // Authenticated: enqueue event for cloud sync
    this.pendingQueue.push(event);
    this.saveLocalFallbackQueue();

    if (!navigator.onLine) {
      this.syncState = 'offline';
      this.notifySync();
      this.requestBackgroundSync();
      return { clientEventId, date: todayStr, timestamp };
    }

    // Schedule debounced background flush (500ms debounce batches rapid taps)
    this.scheduleDebouncedFlush();
    return { clientEventId, date: todayStr, timestamp };
  }

  private scheduleDebouncedFlush() {
    this.syncState = 'syncing';
    this.notifySync();

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.flushPending();
    }, 500);
  }

  // Push pending queue to backend with idempotency guarantee
  public async flushPending(): Promise<void> {
    if (this.isFlushing || !api.getToken()) {
      return;
    }

    // Refresh pendingQueue from IndexedDB if in-memory queue is empty
    if (this.pendingQueue.length === 0) {
      const storedQueue = await idbService.getPendingQueue();
      if (storedQueue.length > 0) {
        this.pendingQueue = storedQueue;
      }
    }

    if (this.pendingQueue.length === 0) {
      if (api.getToken() && this.syncState !== 'offline') {
        this.syncState = 'synced';
        this.notifySync();
      }
      return;
    }

    if (!navigator.onLine) {
      this.syncState = 'offline';
      this.notifySync();
      this.requestBackgroundSync();
      return;
    }

    this.isFlushing = true;
    this.syncState = 'syncing';
    this.notifySync();

    const batch = [...this.pendingQueue];

    try {
      const response = await api.pushSync({
        deviceId: this.deviceId,
        deviceName: this.getDeviceDescription(),
        events: batch,
      });

      // Filter out acknowledged event IDs
      const ackSet = new Set(response.processedEventIds);
      this.pendingQueue = this.pendingQueue.filter((e) => !ackSet.has(e.clientEventId));
      this.saveLocalFallbackQueue();

      // Remove acknowledged events from IndexedDB queue & update history synced flag
      await idbService.removeProcessedFromQueue(response.processedEventIds);

      // Save authoritative daily stats to IndexedDB
      if (response.stats && response.stats.length > 0) {
        await idbService.saveDailyStats(response.stats);
      }

      this.lastSyncedAt = response.serverTime;
      this.syncState = this.pendingQueue.length > 0 ? 'syncing' : 'synced';
      this.retryAttempts = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.notifySync();
      this.notifyData(response);

      if (this.pendingQueue.length > 0) {
        // More arrived while syncing, flush remaining batch
        setTimeout(() => this.flushPending(), 300);
      }
    } catch (err) {
      console.warn('[SyncEngine] Cloud sync failed, retaining pending queue in IndexedDB:', err);
      this.syncState = navigator.onLine ? 'error' : 'offline';
      this.notifySync();
      this.requestBackgroundSync();

      // Exponential backoff automatic retry if online and queue is not empty
      if (navigator.onLine && this.pendingQueue.length > 0 && this.retryAttempts < this.maxRetryAttempts) {
        this.retryAttempts++;
        const backoffMs = Math.min(1000 * Math.pow(2, this.retryAttempts), 16000);
        console.log(`[SyncEngine] Cloud sync error. Scheduling retry #${this.retryAttempts} in ${backoffMs}ms`);
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          if (navigator.onLine && this.pendingQueue.length > 0) {
            this.flushPending();
          }
        }, backoffMs);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  // Pull latest cloud data across devices
  public async pullAuthoritative(): Promise<SyncPullResponse | null> {
    if (!api.getToken() || !navigator.onLine) {
      return null;
    }

    try {
      // First flush pending changes so server has the full picture
      if (this.pendingQueue.length > 0) {
        await this.flushPending();
      }

      this.syncState = 'syncing';
      this.notifySync();

      const data = await api.pullSync();
      this.lastSyncedAt = data.serverTime;
      this.syncState = 'synced';
      this.notifySync();
      this.notifyData(data);

      // Cache authoritative stats to IndexedDB
      if (data.stats && data.stats.length > 0) {
        await idbService.saveDailyStats(data.stats);
      }

      // If server returned recent events, persist to IDB
      if ((data as any).recentEvents && Array.isArray((data as any).recentEvents)) {
        await idbService.saveHistoryEvents((data as any).recentEvents);
      }

      return data;
    } catch (err) {
      console.warn('[SyncEngine] Pull failed:', err);
      this.syncState = navigator.onLine ? 'error' : 'offline';
      this.notifySync();
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // History Timeline & Aggregation
  // ---------------------------------------------------------------------------

  public async getHistoryTimeline(filter?: {
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<DayHistoryGroup[]> {
    // 1. Fetch local history from IndexedDB
    const localEvents = await idbService.getAllHistoryEvents();

    // 2. Fetch server history if online and authenticated
    let serverEvents: CountEvent[] = [];
    if (api.getToken() && navigator.onLine) {
      try {
        const res = await api.getHistory({
          startDate: filter?.startDate,
          endDate: filter?.endDate,
          search: filter?.search,
          limit: 100,
        });
        if (res && res.items) {
          serverEvents = res.items;
          // Cache server events to IndexedDB
          await idbService.saveHistoryEvents(serverEvents);
        }
      } catch (e) {
        console.warn('[SyncEngine] Failed to fetch server history, using offline IndexedDB records:', e);
      }
    }

    // 3. Merge & Deduplicate by clientEventId
    const eventMap = new Map<string, CountEvent>();
    // First put server events
    serverEvents.forEach((e) => eventMap.set(e.clientEventId, { ...e, synced: true }));
    // Then overlay local events (which may include pending un-synced events)
    localEvents.forEach((e) => {
      if (!eventMap.has(e.clientEventId)) {
        eventMap.set(e.clientEventId, e);
      } else {
        // If already present from server, it's confirmed
        eventMap.set(e.clientEventId, { ...e, synced: true });
      }
    });

    let merged = Array.from(eventMap.values());

    // 4. Apply Filters
    if (filter?.startDate) {
      merged = merged.filter((e) => e.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      merged = merged.filter((e) => e.date <= filter.endDate!);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      merged = merged.filter(
        (e) => e.date.includes(q) || String(e.delta).includes(q) || (e.synced ? 'synced' : 'pending').includes(q)
      );
    }

    // 5. Sort descending by timestamp
    merged.sort((a, b) => b.timestamp - a.timestamp);

    // 6. Group by Date into Timeline Buckets
    const todayStr = this.getTodayDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = this.formatDateOnly(yesterdayDate);

    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgoStr = this.formatDateOnly(sevenDaysAgoDate);

    const groupsMap = new Map<string, { label: string; date: string; items: CountEvent[] }>();

    merged.forEach((item) => {
      if (!groupsMap.has(item.date)) {
        let label = item.date;
        if (item.date === todayStr) {
          label = 'Today';
        } else if (item.date === yesterdayStr) {
          label = 'Yesterday';
        } else if (item.date >= sevenDaysAgoStr) {
          label = 'This Week';
        } else {
          // Format e.g. "15 Oct 2026"
          try {
            const parts = item.date.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
          } catch {
            label = item.date;
          }
        }

        groupsMap.set(item.date, {
          label,
          date: item.date,
          items: [],
        });
      }

      groupsMap.get(item.date)!.items.push(item);
    });

    const result: DayHistoryGroup[] = [];
    groupsMap.forEach((grp) => {
      const totalCount = grp.items.reduce((sum, it) => sum + it.delta, 0);
      result.push({
        date: grp.date,
        label: grp.label,
        totalCount,
        totalMalas: Math.floor(totalCount / 108),
        items: grp.items.map((it) => ({
          id: it.id || it.clientEventId,
          clientEventId: it.clientEventId,
          delta: it.delta,
          timestamp: it.timestamp,
          date: it.date,
          synced: Boolean(it.synced),
          serverConfirmedAt: (it as any).serverConfirmedAt,
        })),
      });
    });

    // Sort groups descending by date
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }

  // ---------------------------------------------------------------------------
  // Monthly & Yearly Statistics Breakdown for Charts
  // ---------------------------------------------------------------------------

  public async getMonthlyStats(year: number, month: number): Promise<MonthlyStatsSummary> {
    const stats = await idbService.getAllDailyStats();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month - 1] || `Month ${month}`;

    // Calculate days in month (handling leap years correctly)
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map existing stats
    const dayMap = new Map<number, number>();
    stats.forEach((s) => {
      const parts = s.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y === year && m === month) {
          dayMap.set(d, s.totalCount);
        }
      }
    });

    let totalCount = 0;
    let highestDay: { date: string; count: number } | null = null;
    let activeDaysCount = 0;

    const dailyBreakdown: { day: number; date: string; count: number; malas: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const count = dayMap.get(day) || 0;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      totalCount += count;
      if (count > 0) {
        activeDaysCount++;
        if (!highestDay || count > highestDay.count) {
          highestDay = { date: dateStr, count };
        }
      }
      dailyBreakdown.push({
        day,
        date: dateStr,
        count,
        malas: Math.floor(count / 108),
      });
    }

    const dailyAverage = activeDaysCount > 0 ? Math.round(totalCount / activeDaysCount) : 0;

    return {
      year,
      month,
      monthName,
      totalCount,
      totalMalas: Math.floor(totalCount / 108),
      dailyAverage,
      highestDay,
      activeDaysCount,
      daysInMonth,
      dailyBreakdown,
    };
  }

  public async getYearlyStats(year: number): Promise<YearlyStatsSummary> {
    const stats = await idbService.getAllDailyStats();
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const monthlyCounts = new Array(12).fill(0);

    stats.forEach((s) => {
      const parts = s.date.split('-');
      if (parts.length === 3 && parseInt(parts[0], 10) === year) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          monthlyCounts[m] += s.totalCount;
        }
      }
    });

    let totalCount = 0;
    const monthlyBreakdown = monthlyCounts.map((count, idx) => {
      totalCount += count;
      return {
        month: idx + 1,
        monthName: monthNames[idx],
        count,
        malas: Math.floor(count / 108),
      };
    });

    return {
      year,
      totalCount,
      totalMalas: Math.floor(totalCount / 108),
      monthlyBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // Guest Mode Handling
  // ---------------------------------------------------------------------------

  private recordGuestCount(delta: number, dateStr: string, event: CountEvent) {
    const guest = this.getGuestData();
    guest.lifetimeCount += delta;
    guest.todayCount = (guest.lastDate === dateStr ? guest.todayCount : 0) + delta;
    guest.dailyCounts[dateStr] = (guest.dailyCounts[dateStr] || 0) + delta;
    guest.lastDate = dateStr;

    localStorage.setItem('ramjap_guest_data', JSON.stringify(guest));
    idbService.setAppState('guestData', guest).catch(() => {});

    // Update guest daily stat in IDB
    const dailyCount = guest.dailyCounts[dateStr];
    idbService.saveDailyStats([{
      date: dateStr,
      totalCount: dailyCount,
      totalMalas: Math.floor(dailyCount / 108),
    }]).catch(() => {});
  }

  public getGuestData(): {
    lifetimeCount: number;
    todayCount: number;
    dailyCounts: Record<string, number>;
    lastDate: string;
  } {
    try {
      const raw = localStorage.getItem('ramjap_guest_data');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      lifetimeCount: 0,
      todayCount: 0,
      dailyCounts: {},
      lastDate: this.getTodayDateString(),
    };
  }

  public clearGuestData() {
    localStorage.removeItem('ramjap_guest_data');
    idbService.setAppState('guestData', null).catch(() => {});
  }

  public handleLogout() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryAttempts = 0;
    this.syncState = 'guest';
    this.lastSyncedAt = null;
    this.pendingQueue = [];
    localStorage.removeItem('ramjap_pending_events');
    idbService.clearQueue().catch(() => {});
    this.notifySync();

    const guest = this.getGuestData();
    const todayStr = this.getTodayDateString();
    const todayVal = guest.lastDate === todayStr ? guest.todayCount : 0;
    this.notifyData({
      totalCount: guest.lifetimeCount,
      todayCount: todayVal,
      currentStreak: 1,
      longestStreak: 1,
      stats: [],
      sessions: [],
    });
  }

  public async migrateGuestDataToAccount(): Promise<boolean> {
    const guest = this.getGuestData();
    if (guest.lifetimeCount <= 0 || !api.getToken()) {
      this.clearGuestData();
      return false;
    }

    try {
      this.syncState = 'syncing';
      this.notifySync();

      // Convert guest daily counts to idempotent events
      const eventsToPush: CountEvent[] = [];
      for (const [dateStr, count] of Object.entries(guest.dailyCounts)) {
        if (count > 0) {
          eventsToPush.push({
            id: `guest_migrate_${this.deviceId}_${dateStr}_${count}`,
            clientEventId: `guest_migrate_${this.deviceId}_${dateStr}_${count}`,
            delta: count,
            timestamp: Date.now(),
            date: dateStr,
          });
        }
      }

      if (eventsToPush.length > 0) {
        await api.pushSync({
          deviceId: this.deviceId,
          deviceName: this.getDeviceDescription() + ' (Guest Migration)',
          events: eventsToPush,
        });
      }

      this.clearGuestData();
      await this.pullAuthoritative();
      return true;
    } catch (err) {
      console.error('[SyncEngine] Failed to migrate guest data:', err);
      return false;
    }
  }

  private getDeviceDescription(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android Device';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
    if (/Windows/i.test(ua)) return 'Windows Desktop';
    if (/Macintosh/i.test(ua)) return 'Mac Desktop';
    return 'Web Browser';
  }

  public getTodayDateString(): string {
    return this.formatDateOnly(new Date());
  }

  private formatDateOnly(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export const syncEngine = new SyncEngine();
