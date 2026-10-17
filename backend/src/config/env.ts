import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Candidate paths to search for .env file across working directories
const cwd = process.cwd();
const candidatePaths = [
  path.resolve(cwd, '.env'),
  path.resolve(cwd, 'backend', '.env'),
  path.resolve(cwd, '..', '.env'),
];

let envLoaded = false;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_shri_ram_jap_secure_jwt_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH || path.resolve(cwd, 'ramjap.sqlite'),
  SMTP_SERVICE: (process.env.SMTP_SERVICE || '').trim().toLowerCase(),
  SMTP_HOST: (process.env.SMTP_HOST || '').trim(),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: (process.env.SMTP_USER || '').trim(),
  SMTP_PASS: (process.env.SMTP_PASS || '').trim(),
  SMTP_FROM: (process.env.SMTP_FROM || '').trim() || 'Shri Ram Naam Jap <noreply@ramjap.org>',
};
