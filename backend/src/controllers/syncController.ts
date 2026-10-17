import { Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CountEvent, JapSession, DailyTarget } from '../types/shared.js';

export async function pushSync(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId!;
  const { deviceId, deviceName, events = [], sessions = [], preferences, dailyTargets = [] } = req.body;

  const db = getDb();
  const processedEventIds: string[] = [];
  const now = new Date().toISOString();
  const todayStr = getTodayDateString();

  // Run everything inside an atomic transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Process Count Events with Idempotency
    const insertEventStmt = db.prepare(`
      INSERT OR IGNORE INTO count_events (id, user_id, client_event_id, session_id, delta, timestamp, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const upsertDailyStatStmt = db.prepare(`
      INSERT INTO daily_stats (id, user_id, date, total_count, total_malas, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        total_count = total_count + excluded.total_count,
        total_malas = (total_count + excluded.total_count) / 108,
        updated_at = excluded.updated_at
    `);

    for (const evt of events as CountEvent[]) {
      if (!evt.clientEventId || typeof evt.delta !== 'number' || evt.delta <= 0) {
        continue;
      }

      const eventDate = evt.date || todayStr;
      const eventTime = evt.timestamp || Date.now();
      const eventId = crypto.randomUUID();

      const result = insertEventStmt.run(
        eventId,
        userId,
        evt.clientEventId,
        evt.sessionId || null,
        evt.delta,
        eventTime,
        eventDate,
        now
      ) as any;

      processedEventIds.push(evt.clientEventId);

      // Only increment aggregates if this event was NOT a duplicate
      if (result.changes > 0) {
        const malas = Math.floor(evt.delta / 108);
        upsertDailyStatStmt.run(
          crypto.randomUUID(),
          userId,
          eventDate,
          evt.delta,
          malas,
          now
        );
      }
    }

    // 2. Process Sessions
    const upsertSessionStmt = db.prepare(`
      INSERT INTO jap_sessions (id, user_id, start_time, end_time, count, device_id, device_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        end_time = excluded.end_time,
        count = MAX(jap_sessions.count, excluded.count)
    `);

    for (const s of sessions as JapSession[]) {
      if (!s.id || !s.startTime) continue;
      upsertSessionStmt.run(
        s.id,
        userId,
        s.startTime,
        s.endTime || null,
        s.count || 0,
        s.deviceId || deviceId || 'unknown',
        s.deviceName || deviceName || 'web',
        now
      );
    }

    // 3. Process Daily Targets
    const upsertTargetStmt = db.prepare(`
      INSERT INTO daily_targets (id, user_id, date, target_malas, target_count, achieved_count, completed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        target_malas = excluded.target_malas,
        target_count = excluded.target_count,
        achieved_count = MAX(daily_targets.achieved_count, excluded.achieved_count),
        completed = CASE WHEN MAX(daily_targets.achieved_count, excluded.achieved_count) >= excluded.target_count THEN 1 ELSE 0 END,
        updated_at = excluded.updated_at
    `);

    for (const t of dailyTargets as DailyTarget[]) {
      if (!t.date) continue;
      const tMalas = t.targetMalas || 250;
      const tCount = t.targetCount || tMalas * 108;
      const achieved = t.achievedCount || 0;
      const comp = achieved >= tCount ? 1 : 0;
      upsertTargetStmt.run(
        crypto.randomUUID(),
        userId,
        t.date,
        tMalas,
        tCount,
        achieved,
        comp,
        now
      );
    }

    // 4. Update Preferences if supplied
    if (preferences && Object.keys(preferences).length > 0) {
      const cur = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
      db.prepare(`
        INSERT INTO user_preferences (user_id, language, theme, mala_target, mala_size, sound_enabled, vibration_enabled, selected_darshan_id, bg_music_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          language = COALESCE(?, user_preferences.language),
          theme = COALESCE(?, user_preferences.theme),
          mala_target = COALESCE(?, user_preferences.mala_target),
          mala_size = COALESCE(?, user_preferences.mala_size),
          sound_enabled = COALESCE(?, user_preferences.sound_enabled),
          vibration_enabled = COALESCE(?, user_preferences.vibration_enabled),
          selected_darshan_id = COALESCE(?, user_preferences.selected_darshan_id),
          bg_music_state = COALESCE(?, user_preferences.bg_music_state),
          updated_at = excluded.updated_at
      `).run(
        userId,
        preferences.language || cur?.language || 'en',
        preferences.theme || cur?.theme || 'saffron',
        preferences.malaTarget || cur?.mala_target || 250,
        preferences.malaSize || cur?.mala_size || 108,
        preferences.soundEnabled !== undefined ? (preferences.soundEnabled ? 1 : 0) : cur?.sound_enabled ?? 1,
        preferences.vibrationEnabled !== undefined ? (preferences.vibrationEnabled ? 1 : 0) : cur?.vibration_enabled ?? 1,
        preferences.selectedDarshanId || cur?.selected_darshan_id || 1,
        preferences.bgMusicState !== undefined ? (preferences.bgMusicState ? 1 : 0) : cur?.bg_music_state ?? 0,
        now,
        preferences.language ?? null,
        preferences.theme ?? null,
        preferences.malaTarget ?? null,
        preferences.malaSize ?? null,
        preferences.soundEnabled !== undefined ? (preferences.soundEnabled ? 1 : 0) : null,
        preferences.vibrationEnabled !== undefined ? (preferences.vibrationEnabled ? 1 : 0) : null,
        preferences.selectedDarshanId ?? null,
        preferences.bgMusicState !== undefined ? (preferences.bgMusicState ? 1 : 0) : null
      );
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[SyncController] Push transaction error:', err);
    res.status(500).json({ error: 'Sync push failed on server.' });
    return;
  }

  // Calculate Authoritative Cloud Totals
  const responseData = computeAuthoritativeState(userId, todayStr);
  res.status(200).json({
    ...responseData,
    processedEventIds,
    serverTime: Date.now(),
  });
}

export async function pullSync(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const todayStr = getTodayDateString();
    const data = computeAuthoritativeState(userId, todayStr);

    res.status(200).json({
      ...data,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error('[SyncController] Pull error:', err);
    res.status(500).json({ error: 'Sync pull failed on server.' });
  }
}

export async function getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const todayStr = getTodayDateString();
    const data = computeAuthoritativeState(userId, todayStr);
    res.status(200).json(data);
  } catch (err) {
    console.error('[SyncController] Stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
}

export async function getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const search = (req.query.search as string || '').trim();

    const db = getDb();

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }
    if (search) {
      whereClause += ' AND (date LIKE ? OR CAST(delta AS TEXT) LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM count_events ${whereClause}`).get(...params) as any;
    const totalItems = countRow?.total || 0;

    const query = `
      SELECT id, client_event_id, delta, timestamp, date 
      FROM count_events 
      ${whereClause} 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = db.prepare(query).all(...params, limit, offset) as any[];

    const items = rows.map((r) => ({
      id: r.id,
      clientEventId: r.client_event_id,
      delta: r.delta,
      timestamp: r.timestamp,
      date: r.date,
      synced: true,
    }));

    res.status(200).json({
      items,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (err: any) {
    console.error('[SyncController] Get history error:', err);
    res.status(500).json({ error: 'Failed to retrieve jap history.' });
  }
}

export async function exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const db = getDb();

    const user = db.prepare('SELECT id, email, full_name, created_at FROM users WHERE id = ?').get(userId) as any;
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
    const stats = db.prepare('SELECT date, total_count, total_malas FROM daily_stats WHERE user_id = ? ORDER BY date DESC').all(userId) as any[];
    const sessions = db.prepare('SELECT id, start_time, end_time, count, device_name, created_at FROM jap_sessions WHERE user_id = ? ORDER BY start_time DESC').all(userId) as any[];
    const totalRow = db.prepare('SELECT COALESCE(SUM(delta), 0) as total FROM count_events WHERE user_id = ?').get(userId) as any;

    const lifetimeCount = totalRow.total || 0;
    const dailyMap: Record<string, number> = {};
    for (const s of stats) {
      dailyMap[s.date] = s.total_count;
    }

    // Format export package
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at,
      },
      preferences: prefs,
      lifetimeCount,
      dailyStats: stats,
      sessions,
      // Legacy backup format string representation
      legacyBackupFormat: generateLegacyBackupString({
        lifetimeCount,
        dailyCounts: dailyMap,
        malaDailyTarget: prefs?.mala_target || 250,
        malaSize: prefs?.mala_size || 108,
        language: prefs?.language || 'en',
        lastCountDate: stats[0]?.date || getTodayDateString(),
      }),
    };

    res.status(200).json(exportData);
  } catch (err) {
    console.error('[SyncController] Export error:', err);
    res.status(500).json({ error: 'Failed to export user data.' });
  }
}

export async function importUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { jsonString, legacyString } = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    let importedEventsCount = 0;

    if (jsonString) {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (parsed.dailyStats && Array.isArray(parsed.dailyStats)) {
        db.exec('BEGIN TRANSACTION;');
        try {
          const upsertStat = db.prepare(`
            INSERT INTO daily_stats (id, user_id, date, total_count, total_malas, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET
              total_count = MAX(daily_stats.total_count, excluded.total_count),
              total_malas = MAX(daily_stats.total_count, excluded.total_count) / 108,
              updated_at = excluded.updated_at
          `);

          const insertEvt = db.prepare(`
            INSERT OR IGNORE INTO count_events (id, user_id, client_event_id, delta, timestamp, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          for (const s of parsed.dailyStats) {
            if (s.date && s.total_count > 0) {
              upsertStat.run(crypto.randomUUID(), userId, s.date, s.total_count, Math.floor(s.total_count / 108), now);
              insertEvt.run(crypto.randomUUID(), userId, `import_${s.date}_${s.total_count}`, s.total_count, Date.now(), s.date, now);
              importedEventsCount += s.total_count;
            }
          }
          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }
      }
    } else if (legacyString) {
      const parsedLegacy = parseLegacyBackupString(legacyString);
      if (parsedLegacy) {
        db.exec('BEGIN TRANSACTION;');
        try {
          const upsertStat = db.prepare(`
            INSERT INTO daily_stats (id, user_id, date, total_count, total_malas, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET
              total_count = MAX(daily_stats.total_count, excluded.total_count),
              total_malas = MAX(daily_stats.total_count, excluded.total_count) / 108,
              updated_at = excluded.updated_at
          `);

          const insertEvt = db.prepare(`
            INSERT OR IGNORE INTO count_events (id, user_id, client_event_id, delta, timestamp, date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          for (const [dateStr, count] of Object.entries(parsedLegacy.dailyCounts)) {
            if (count > 0) {
              upsertStat.run(crypto.randomUUID(), userId, dateStr, count, Math.floor(count / 108), now);
              insertEvt.run(crypto.randomUUID(), userId, `legacy_${dateStr}_${count}`, count, Date.now(), dateStr, now);
              importedEventsCount += count;
            }
          }
          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        }
      }
    }

    const state = computeAuthoritativeState(userId, getTodayDateString());
    res.status(200).json({
      message: `Import successful. Synchronized records. Total count is now ${state.totalCount}.`,
      ...state,
    });
  } catch (err: any) {
    console.error('[SyncController] Import error:', err);
    res.status(500).json({ error: 'Failed to import backup data: ' + (err.message || 'unknown error') });
  }
}

function computeAuthoritativeState(userId: string, todayStr: string) {
  const db = getDb();

  // 1. Total lifetime count
  const totalRow = db.prepare('SELECT COALESCE(SUM(delta), 0) as total FROM count_events WHERE user_id = ?').get(userId) as any;
  const totalCount = totalRow?.total || 0;

  // 2. Today's count
  const todayRow = db.prepare('SELECT total_count FROM daily_stats WHERE user_id = ? AND date = ?').get(userId, todayStr) as any;
  const todayCount = todayRow?.total_count || 0;

  // 3. Daily stats list (last 365 days)
  const statsRows = db.prepare('SELECT date, total_count, total_malas FROM daily_stats WHERE user_id = ? ORDER BY date DESC LIMIT 365').all(userId) as any[];
  const stats = statsRows.map((r) => ({
    date: r.date,
    totalCount: r.total_count,
    totalMalas: r.total_malas,
  }));

  // 4. Streaks
  const { currentStreak, longestStreak } = calculateStreaks(stats, todayStr);

  // 5. Recent Sessions (last 50)
  const sessionRows = db.prepare('SELECT * FROM jap_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT 50').all(userId) as any[];
  const sessions: JapSession[] = sessionRows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    startTime: s.start_time,
    endTime: s.end_time,
    count: s.count,
    deviceId: s.device_id,
    deviceName: s.device_name,
    synced: true,
  }));

  // 6. Preferences
  const prefRow = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
  const preferences = prefRow
    ? {
        userId,
        language: prefRow.language,
        theme: prefRow.theme,
        malaTarget: prefRow.mala_target,
        malaSize: prefRow.mala_size,
        soundEnabled: Boolean(prefRow.sound_enabled),
        vibrationEnabled: Boolean(prefRow.vibration_enabled),
        selectedDarshanId: prefRow.selected_darshan_id,
        bgMusicState: Boolean(prefRow.bg_music_state),
      }
    : {
        userId,
        language: 'en',
        theme: 'saffron',
        malaTarget: 250,
        malaSize: 108,
        soundEnabled: true,
        vibrationEnabled: true,
        selectedDarshanId: 1,
        bgMusicState: false,
      };

  // 7. Daily Targets
  const targetRows = db.prepare('SELECT * FROM daily_targets WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(userId) as any[];
  const dailyTargets = targetRows.map((t) => ({
    date: t.date,
    targetMalas: t.target_malas,
    targetCount: t.target_count,
    achievedCount: t.achieved_count,
    completed: Boolean(t.completed),
  }));

  // 8. Recent Count Events (last 100 for instant offline reconciliation & timeline)
  const eventRows = db.prepare('SELECT id, client_event_id, delta, timestamp, date FROM count_events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100').all(userId) as any[];
  const recentEvents = eventRows.map((e) => ({
    id: e.id,
    clientEventId: e.client_event_id,
    delta: e.delta,
    timestamp: e.timestamp,
    date: e.date,
    synced: true,
  }));

  return {
    totalCount,
    todayCount,
    currentStreak,
    longestStreak,
    stats,
    sessions,
    recentEvents,
    preferences,
    dailyTargets,
  };
}

function calculateStreaks(stats: { date: string; totalCount: number }[], todayStr: string) {
  if (stats.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const validDates = stats.filter((s) => s.totalCount > 0).map((s) => s.date);
  const dateSet = new Set(validDates);

  if (dateSet.size === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let checkDate = new Date();
  let checkStr = formatDate(checkDate);

  // If today has no counts yet, start checking from yesterday to preserve active streak
  if (!dateSet.has(checkStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
    checkStr = formatDate(checkDate);
  }

  while (dateSet.has(checkStr)) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
    checkStr = formatDate(checkDate);
  }

  // Calculate longest streak
  let longestStreak = currentStreak;
  const sortedDates = Array.from(dateSet).sort();

  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDates) {
    const cur = new Date(dStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = cur;
  }

  return { currentStreak, longestStreak };
}

function getTodayDateString(): string {
  return formatDate(new Date());
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function generateLegacyBackupString(data: {
  lifetimeCount: number;
  dailyCounts: Record<string, number>;
  malaDailyTarget: number;
  malaSize: number;
  language: string;
  lastCountDate: string;
}): string {
  const metaObj = {
    ram_notification_subscribe: 0,
    firstTimePromoFlag: 1,
    bgMusicState: 0,
    firstTimeFlag: 1748,
    lastUsedJapId: 'RAM',
    language: data.language || 'hi',
    inputDataArray: [
      {
        dailyJapTarget: data.malaDailyTarget || 250,
        defaultJapCounter: data.malaSize || 108,
        englishName: 'राम ',
        hindiName: 'राम ',
        isFavorite: true,
        isJapSelected: true,
        japCardId: 'RAM',
        textJapHeader: 'राम राम',
      },
    ],
  };

  const ramObj: Record<string, any> = {
    isSoundAlert: 1,
    last_count_date: data.lastCountDate,
    jap_card_id: 'RAM',
    life_time_counter: data.lifetimeCount,
    mala_daily_target: data.malaDailyTarget || 250,
    mala_size: data.malaSize || 108,
  };

  for (const [date, count] of Object.entries(data.dailyCounts)) {
    // Format DD-MM-YYYY
    const parts = date.split('-');
    const formatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : date;
    ramObj[formatted] = count;
  }

  const part1Base64 = Buffer.from(JSON.stringify(metaObj)).toString('base64');
  const part2Base64 = Buffer.from(JSON.stringify(ramObj)).toString('base64');

  return `mydevotion~#@@#~${part1Base64}\n\nRAM~#@@#~${part2Base64}\n`;
}

export function parseLegacyBackupString(raw: string): {
  lifetimeCount: number;
  dailyCounts: Record<string, number>;
  malaDailyTarget: number;
  malaSize: number;
} | null {
  try {
    const parts = raw.split('~#@@#~');
    if (parts.length < 3) return null;

    const base64Second = parts[2].trim().split('\n')[0].trim();
    const decoded = Buffer.from(base64Second, 'base64').toString('utf-8');

    // Decode Java Map toString / JSON format
    let cleanJson = decoded.trim();
    if (cleanJson.startsWith('{') && !cleanJson.includes('":')) {
      // It's Java map format like {life_time_counter=990702, mala_daily_target=250, 05-11-2025=16417}
      cleanJson = cleanJson
        .replace(/([a-zA-Z0-9_\-]+)=/g, '"$1":')
        .replace(/:([a-zA-Z0-9_\-]+)([,}])/g, ':"$1"$2');
    }

    const ramData = JSON.parse(cleanJson);
    const dailyCounts: Record<string, number> = {};

    for (const [key, val] of Object.entries(ramData)) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(key)) {
        const [d, m, y] = key.split('-');
        const isoDate = `${y}-${m}-${d}`;
        dailyCounts[isoDate] = Number(val) || 0;
      }
    }

    return {
      lifetimeCount: Number(ramData.life_time_counter) || 0,
      dailyCounts,
      malaDailyTarget: Number(ramData.mala_daily_target) || 250,
      malaSize: Number(ramData.mala_size) || 108,
    };
  } catch (err) {
    console.error('Failed to parse legacy backup:', err);
    return null;
  }
}
