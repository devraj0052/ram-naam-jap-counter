import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Flame,
  ChevronDown,
  X,
} from 'lucide-react';
import { DayHistoryGroup } from '../types/shared';
import { syncEngine } from '../services/syncEngine';

interface JapHistoryTimelineProps {
  currentLifetime: number;
  onSync: () => Promise<void>;
  syncState: string;
}

export const JapHistoryTimeline: React.FC<JapHistoryTimelineProps> = ({
  currentLifetime,
  onSync,
  syncState,
}) => {
  const [historyGroups, setHistoryGroups] = useState<DayHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageLimit, setPageLimit] = useState(10); // Display 10 date groups at a time
  const [isSyncing, setIsSyncing] = useState(false);

  // Compute date strings for quick filters
  const todayStr = syncEngine.getTodayDateString();

  const loadHistory = async () => {
    setLoading(true);
    try {
      let startDate: string | undefined = undefined;
      const today = new Date();

      if (filterRange === 'today') {
        startDate = todayStr;
      } else if (filterRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (filterRange === 'month') {
        startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      }

      const groups = await syncEngine.getHistoryTimeline({
        startDate,
        search: searchQuery || undefined,
      });

      setHistoryGroups(groups);
    } catch (err) {
      console.warn('[JapHistoryTimeline] Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filterRange, searchQuery, currentLifetime, syncState]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      await loadHistory();
    } finally {
      setIsSyncing(false);
    }
  };

  const visibleGroups = historyGroups.slice(0, pageLimit);
  const totalEntriesCount = historyGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="w-full bg-white dark:bg-stone-900 border border-saffron-200 dark:border-stone-800 rounded-3xl p-5 shadow-sm">
      {/* Title & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-saffron-600 dark:text-amber-400" />
            <span>Ram Naam Jap Audit Log</span>
          </h3>
          <p className="text-[11px] text-stone-400">
            Granular timestamped records with instant offline & cloud sync status
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded-xl border border-saffron-300 dark:border-stone-700 bg-saffron-50 dark:bg-stone-800 hover:bg-saffron-100 text-saffron-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        {/* Quick Filter Buttons */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-semibold overflow-x-auto">
          {(['all', 'today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all capitalize ${
                filterRange === r
                  ? 'bg-white dark:bg-stone-700 text-saffron-700 dark:text-amber-300 shadow-sm font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {r === 'all' ? 'All Dates' : r === 'today' ? 'Today' : r === 'week' ? 'Last 7 Days' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by date (YYYY-MM-DD) or count..."
            className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-saffron-500 text-stone-800 dark:text-stone-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="py-10 text-center text-xs text-stone-400">Loading chanting history...</div>
      ) : visibleGroups.length === 0 ? (
        <div className="py-10 text-center">
          <Calendar className="w-8 h-8 text-stone-300 dark:text-stone-700 mx-auto mb-2" />
          <p className="text-xs text-stone-500 font-medium">No jap history matches your filter.</p>
          <p className="text-[11px] text-stone-400 mt-1">Start chanting Ram Naam to build your audit log!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.date} className="relative">
              {/* Daily Header Summary */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-saffron-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-saffron-600 dark:text-amber-400 shrink-0" />
                  <span className="font-heading font-bold text-sm text-stone-800 dark:text-stone-100">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">({group.date})</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-xs text-saffron-600 dark:text-amber-400">
                    {group.totalCount.toLocaleString()} Jap
                  </span>
                  <span className="text-[10px] text-stone-400 ml-1">({group.totalMalas} Malas)</span>
                </div>
              </div>

              {/* Timestamped Chanting Events */}
              <div className="space-y-2 pl-3 border-l-2 border-saffron-200 dark:border-stone-800 ml-1">
                {group.items.map((item) => {
                  const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={item.clientEventId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800/80 hover:bg-saffron-50/40 dark:hover:bg-stone-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {/* Status Icon */}
                        {item.synced ? (
                          <div
                            title="Synced: Confirmed in server database"
                            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Synced</span>
                          </div>
                        ) : (
                          <div
                            title="Pending Sync: Saved safely in IndexedDB, will push to server automatically"
                            className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-medium animate-pulse"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pending Sync</span>
                          </div>
                        )}

                        <span className="text-xs text-stone-600 dark:text-stone-300 font-mono">
                          {timeStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-saffron-600 dark:text-amber-400">
                          +{item.delta.toLocaleString()} Ram
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination / Load More */}
          {historyGroups.length > pageLimit && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPageLimit((prev) => prev + 10)}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 flex items-center gap-1.5 mx-auto"
              >
                <span>Load More Days</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
