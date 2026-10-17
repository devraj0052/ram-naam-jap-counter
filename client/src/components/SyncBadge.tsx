import React from 'react';
import { Cloud, CloudOff, RefreshCw, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { useJap } from '../context/JapContext';
import { useLanguage } from '../context/LanguageContext';
import { syncEngine } from '../services/syncEngine';

export const SyncBadge: React.FC = () => {
  const { syncState, syncNow, lastSyncedAt } = useJap();
  const { t } = useLanguage();
  const pendingCount = syncEngine.getSyncState().pendingCount;

  const getBadgeConfig = () => {
    switch (syncState) {
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />,
          label: t.syncing,
          bg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
          label: 'Sync Failed',
          bg: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300',
        };
      case 'offline':
        return {
          icon: pendingCount > 0 ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : <CloudOff className="w-3.5 h-3.5 text-stone-500" />,
          label: pendingCount > 0 ? `Pending Sync (${pendingCount})` : t.offline,
          bg: pendingCount > 0
            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
            : 'bg-stone-100 border-stone-200 text-stone-600 dark:bg-stone-900/60 dark:border-stone-700 dark:text-stone-300',
        };
      case 'synced':
        if (pendingCount > 0) {
          return {
            icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
            label: `Pending Sync (${pendingCount})`,
            bg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
          };
        }
        return {
          icon: <Cloud className="w-3.5 h-3.5 text-emerald-500" />,
          label: t.synced,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
        };
      case 'guest':
      default:
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-saffron-600" />,
          label: t.guestMode,
          bg: 'bg-saffron-50 border-saffron-200 text-saffron-700 dark:bg-saffron-950/40 dark:border-saffron-800 dark:text-saffron-300',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <button
      onClick={() => syncNow()}
      title={lastSyncedAt ? `${t.lastSynced}: ${new Date(lastSyncedAt).toLocaleTimeString()}` : t.syncNow}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${config.bg}`}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
};
