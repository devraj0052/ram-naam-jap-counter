import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { ENV } from './env.js';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dbDir = path.dirname(path.resolve(ENV.DB_PATH));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = new DatabaseSync(ENV.DB_PATH);
    // Optimize performance and enforce integrity
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // 2. Email Verification tokens & OTP
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_verifications_user ON email_verifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_token ON email_verifications(token);
    CREATE INDEX IF NOT EXISTS idx_verifications_code ON email_verifications(code);
  `);

  // 3. Password Reset tokens & OTP
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);
  `);

  // 4. User Preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      language TEXT NOT NULL DEFAULT 'en',
      theme TEXT NOT NULL DEFAULT 'saffron',
      mala_target INTEGER NOT NULL DEFAULT 250,
      mala_size INTEGER NOT NULL DEFAULT 108,
      sound_enabled INTEGER NOT NULL DEFAULT 1,
      vibration_enabled INTEGER NOT NULL DEFAULT 1,
      selected_darshan_id INTEGER NOT NULL DEFAULT 1,
      bg_music_state INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Jap Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS jap_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      count INTEGER NOT NULL DEFAULT 0,
      device_id TEXT,
      device_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON jap_sessions(user_id, start_time DESC);
  `);

  // 6. Count Events with Idempotency client_event_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS count_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_event_id TEXT UNIQUE NOT NULL,
      session_id TEXT,
      delta INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_events_user_date ON count_events(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_events_client_id ON count_events(client_event_id);
  `);

  // 7. Daily Aggregated Stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_count INTEGER NOT NULL DEFAULT 0,
      total_malas INTEGER NOT NULL DEFAULT 0,
      streak_day INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
  `);

  // 8. Daily Targets
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_targets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      target_malas INTEGER NOT NULL DEFAULT 250,
      target_count INTEGER NOT NULL DEFAULT 27000,
      achieved_count INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON daily_targets(user_id, date DESC);
  `);
}
