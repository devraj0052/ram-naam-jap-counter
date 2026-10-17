export type Language = 'en' | 'gu' | 'hi';
export type Theme = 'saffron' | 'dark' | 'light';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId?: string;
  language: Language;
  theme: Theme;
  malaTarget: number; // e.g. 250 malas
  malaSize: number; // default 108
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  selectedDarshanId?: number;
  bgMusicState?: boolean;
}

export interface JapSession {
  id: string; // UUID
  userId?: string;
  startTime: number;
  endTime?: number;
  count: number;
  deviceId: string;
  deviceName: string;
  synced?: boolean;
}

export interface CountEvent {
  id: string; // UUID
  clientEventId: string; // Idempotency key
  userId?: string;
  sessionId?: string;
  delta: number;
  timestamp: number; // Epoch ms
  date: string; // YYYY-MM-DD (local date for accurate daily aggregation)
  synced?: boolean;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  totalCount: number;
  totalMalas: number;
  streakDay?: number;
}

export interface DailyTarget {
  date: string; // YYYY-MM-DD
  targetMalas: number;
  targetCount: number;
  achievedCount: number;
  completed: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  preferences: UserPreferences;
  message?: string;
}

export interface SyncPushPayload {
  deviceId: string;
  deviceName: string;
  events: CountEvent[];
  sessions?: JapSession[];
  preferences?: Partial<UserPreferences>;
  dailyTargets?: DailyTarget[];
  lastSyncedAt?: number;
}

export interface SyncPullResponse {
  serverTime: number;
  totalCount: number;
  todayCount: number;
  currentStreak: number;
  longestStreak: number;
  stats: DailyStat[];
  sessions: JapSession[];
  preferences: UserPreferences;
  dailyTargets: DailyTarget[];
  processedEventIds: string[];
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'guest';

export interface LegacyBackupData {
  lifetimeCount: number;
  dailyCounts: Record<string, number>;
  malaDailyTarget: number;
  malaSize: number;
  language: string;
  lastCountDate: string;
}

export interface JapHistoryItem {
  id: string;
  clientEventId: string;
  delta: number;
  timestamp: number;
  date: string;
  synced: boolean;
  serverConfirmedAt?: number;
}

export interface DayHistoryGroup {
  date: string;
  label: string;
  totalCount: number;
  totalMalas: number;
  items: JapHistoryItem[];
}

export interface MonthlyStatsSummary {
  year: number;
  month: number;
  monthName: string;
  totalCount: number;
  totalMalas: number;
  dailyAverage: number;
  highestDay: { date: string; count: number } | null;
  activeDaysCount: number;
  daysInMonth: number;
  dailyBreakdown: { day: number; date: string; count: number; malas: number }[];
}

export interface YearlyStatsSummary {
  year: number;
  totalCount: number;
  totalMalas: number;
  monthlyBreakdown: { month: number; monthName: string; count: number; malas: number }[];
}
