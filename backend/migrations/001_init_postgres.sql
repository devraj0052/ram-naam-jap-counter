-- PostgreSQL Schema Migration for Shri Ram Naam Jap Counter
-- Run with: psql -d ramjap -f 001_init_postgres.sql

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_verifications_code ON email_verifications(code);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  theme VARCHAR(20) NOT NULL DEFAULT 'saffron',
  mala_target INTEGER NOT NULL DEFAULT 250,
  mala_size INTEGER NOT NULL DEFAULT 108,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  selected_darshan_id INTEGER NOT NULL DEFAULT 1,
  bg_music_state BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jap_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  count INTEGER NOT NULL DEFAULT 0,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_time ON jap_sessions(user_id, start_time DESC);

CREATE TABLE IF NOT EXISTS count_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_event_id VARCHAR(255) UNIQUE NOT NULL,
  session_id UUID,
  delta INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON count_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON count_events(client_event_id);

CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  total_malas INTEGER NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_daily_stat UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

CREATE TABLE IF NOT EXISTS daily_targets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  target_malas INTEGER NOT NULL DEFAULT 250,
  target_count INTEGER NOT NULL DEFAULT 27000,
  achieved_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_daily_target UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON daily_targets(user_id, date DESC);
