import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { DailyStat, JapSession, SyncState, SyncPullResponse } from '../types/shared';
import { audioService } from '../services/audioService';
import { syncEngine } from '../services/syncEngine';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

interface JapContextType {
  lifetimeCount: number;
  todayCount: number;
  currentBead: number;
  todayMalas: number;
  totalMalas: number;
  targetMalas: number;
  targetCount: number;
  currentStreak: number;
  longestStreak: number;
  syncState: SyncState;
  lastSyncedAt: number | null;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  selectedDarshanId: number;
  dailyStats: DailyStat[];
  sessions: JapSession[];
  incrementCount: (delta?: number) => void;
  setTargetMalas: (malas: number) => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  setSelectedDarshanId: (id: number) => void;
  syncNow: () => Promise<void>;
  applyImportedState: (data: SyncPullResponse) => void;
}

const JapContext = createContext<JapContextType | undefined>(undefined);

export const JapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // State
  const [lifetimeCount, setLifetimeCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [currentBead, setCurrentBead] = useState<number>(0);
  const [targetMalas, setTargetMalasState] = useState<number>(250);
  const [currentStreak, setCurrentStreak] = useState<number>(1);
  const [longestStreak, setLongestStreak] = useState<number>(1);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [sessions, setSessions] = useState<JapSession[]>([]);

  const [syncState, setSyncState] = useState<SyncState>('guest');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ramjap_sound') !== 'false';
  });
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ramjap_vibration') !== 'false';
  });
  const [selectedDarshanId, setSelectedDarshanIdState] = useState<number>(() => {
    const s = localStorage.getItem('ramjap_darshan');
    return s ? parseInt(s, 10) : 1;
  });

  // Load initial counts (guest data if unauthenticated, or cached state)
  useEffect(() => {
    if (!isAuthenticated) {
      const guest = syncEngine.getGuestData();
      const todayStr = syncEngine.getTodayDateString();
      const todayVal = guest.lastDate === todayStr ? guest.todayCount : 0;
      setLifetimeCount(guest.lifetimeCount);
      setTodayCount(todayVal);
      setCurrentBead(todayVal % 108);
      setSyncState('guest');
    }
  }, [isAuthenticated]);

  // Subscribe to SyncEngine notifications
  useEffect(() => {
    const unsubSync = syncEngine.subscribeSync((state, time) => {
      setSyncState(state);
      setLastSyncedAt(time);
    });

    const unsubData = syncEngine.subscribeData((data) => {
      if (data.totalCount !== undefined) setLifetimeCount(data.totalCount);
      if (data.todayCount !== undefined) {
        setTodayCount(data.todayCount);
        setCurrentBead(data.todayCount % 108);
      }
      if (data.currentStreak !== undefined) setCurrentStreak(data.currentStreak);
      if (data.longestStreak !== undefined) setLongestStreak(data.longestStreak);
      if (data.stats) setDailyStats(data.stats);
      if (data.sessions) setSessions(data.sessions);
      if (data.preferences?.malaTarget) setTargetMalasState(data.preferences.malaTarget);
      if (data.preferences?.selectedDarshanId) setSelectedDarshanIdState(data.preferences.selectedDarshanId);
    });

    return () => {
      unsubSync();
      unsubData();
    };
  }, []);

  const triggerCelebration = (isDailyTarget = false) => {
    try {
      if (isDailyTarget) {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#ea580c', '#f59e0b', '#fbbf24', '#ffffff'],
        });
      } else {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#ea580c', '#f59e0b'],
        });
      }
    } catch {}
  };

  const incrementCount = useCallback((delta: number = 1) => {
    setLifetimeCount((prev) => prev + delta);
    setTodayCount((prev) => {
      const nextToday = prev + delta;
      const nextBead = nextToday % 108;
      setCurrentBead(nextBead);

      // Check for Mala Completion (every 108)
      if (Math.floor(nextToday / 108) > Math.floor(prev / 108)) {
        audioService.playMalaBell();
        triggerCelebration(false);
      }

      // Check for Daily Target Completion
      const targetCount = targetMalas * 108;
      if (prev < targetCount && nextToday >= targetCount) {
        audioService.playMalaBell();
        triggerCelebration(true);
      }

      return nextToday;
    });

    // Record through sync engine (queues for cloud sync or stores in guest mode)
    syncEngine.recordCount(delta);
  }, [targetMalas]);

  const setTargetMalas = (malas: number) => {
    setTargetMalasState(malas);
    if (isAuthenticated) {
      api.updatePreferences({ malaTarget: malas }).catch(() => {});
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSoundEnabled(next);
    localStorage.setItem('ramjap_sound', String(next));
    if (isAuthenticated) {
      api.updatePreferences({ soundEnabled: next }).catch(() => {});
    }
  };

  const toggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    audioService.setVibrationEnabled(next);
    localStorage.setItem('ramjap_vibration', String(next));
    if (isAuthenticated) {
      api.updatePreferences({ vibrationEnabled: next }).catch(() => {});
    }
  };

  const setSelectedDarshanId = (id: number) => {
    setSelectedDarshanIdState(id);
    localStorage.setItem('ramjap_darshan', String(id));
    if (isAuthenticated) {
      api.updatePreferences({ selectedDarshanId: id }).catch(() => {});
    }
  };

  const syncNow = async () => {
    if (isAuthenticated) {
      await syncEngine.flushPending();
      await syncEngine.pullAuthoritative();
    }
  };

  const applyImportedState = (data: SyncPullResponse) => {
    if (data.totalCount !== undefined) setLifetimeCount(data.totalCount);
    if (data.todayCount !== undefined) {
      setTodayCount(data.todayCount);
      setCurrentBead(data.todayCount % 108);
    }
    if (data.currentStreak !== undefined) setCurrentStreak(data.currentStreak);
    if (data.longestStreak !== undefined) setLongestStreak(data.longestStreak);
    if (data.stats) setDailyStats(data.stats);
    if (data.sessions) setSessions(data.sessions);
  };

  const todayMalas = Math.floor(todayCount / 108);
  const totalMalas = Math.floor(lifetimeCount / 108);
  const targetCount = targetMalas * 108;

  return (
    <JapContext.Provider
      value={{
        lifetimeCount,
        todayCount,
        currentBead,
        todayMalas,
        totalMalas,
        targetMalas,
        targetCount,
        currentStreak,
        longestStreak,
        syncState,
        lastSyncedAt,
        soundEnabled,
        vibrationEnabled,
        selectedDarshanId,
        dailyStats,
        sessions,
        incrementCount,
        setTargetMalas,
        toggleSound,
        toggleVibration,
        setSelectedDarshanId,
        syncNow,
        applyImportedState,
      }}
    >
      {children}
    </JapContext.Provider>
  );
};

export const useJap = (): JapContextType => {
  const ctx = useContext(JapContext);
  if (!ctx) throw new Error('useJap must be used within JapProvider');
  return ctx;
};
