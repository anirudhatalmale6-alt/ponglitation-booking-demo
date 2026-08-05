import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { SEED_SERVICES, SEED_SCHEDULE } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, 'pongli.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ref          TEXT UNIQUE,
    service_key  TEXT NOT NULL,
    service_name TEXT NOT NULL,
    is_enquiry   INTEGER NOT NULL DEFAULT 0,
    date         TEXT,                       -- YYYY-MM-DD (CT)
    time         TEXT,                       -- e.g. "3:00 PM"
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT,
    notes        TEXT,
    status       TEXT NOT NULL DEFAULT 'booked',   -- booked | cancelled
    reminder_sent INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Prevent double-booking at the database level: only one active booking may
// hold a given (date, time). Cancelled rows are excluded via the partial index.
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_slot
  ON bookings(date, time)
  WHERE status = 'booked' AND is_enquiry = 0;
`);

// ---- settings helpers ----
const getRaw = db.prepare('SELECT value FROM settings WHERE key = ?');
const setRaw = db.prepare(
  'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
);

export function getSetting(key, fallback = null) {
  const row = getRaw.get(key);
  return row ? JSON.parse(row.value) : fallback;
}
export function setSetting(key, value) {
  setRaw.run(key, JSON.stringify(value));
  return value;
}

// Seed defaults once.
if (getSetting('services') === null) setSetting('services', SEED_SERVICES);
if (getSetting('schedule') === null) setSetting('schedule', SEED_SCHEDULE);
if (getSetting('blockedDates') === null) setSetting('blockedDates', []);
if (getSetting('copy') === null) {
  setSetting('copy', {
    heroTitle: 'Grow through whatever you go through.',
    heroLead: 'Motivational sessions and table-tennis lessons for anyone rising through something hard. Break the chains. Keep growing. And never do it alone.',
  });
}
