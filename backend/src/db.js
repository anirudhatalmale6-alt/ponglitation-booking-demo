import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { SEED_SERVICES, SEED_SCHEDULE, SEED_TOPICS, SEED_COPY } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets the database live on a persistent disk in production
// (e.g. a Render disk mounted at /var/data) so bookings survive restarts.
export const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');
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

// Extra booking-form answers, added after the first release. The live database
// lives on a persistent disk, so existing tables have to be migrated in place.
const bookingCols = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
for (const [col, type] of [
  ['organization', 'TEXT'],
  ['purpose', 'TEXT'],
  ['location_mode', 'TEXT'],
  ['participants', 'INTEGER'],
]) {
  if (!bookingCols.includes(col)) db.exec(`ALTER TABLE bookings ADD COLUMN ${col} ${type}`);
}

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
if (getSetting('topics') === null) setSetting('topics', SEED_TOPICS);
if (getSetting('copy') === null) setSetting('copy', SEED_COPY);

// The homepage is painted from these settings, so anything the page needs must
// exist even in a database seeded before that key was introduced. The live
// database sits on a persistent disk and is never rebuilt, so backfill in place
// rather than relying on the seeds above (they only fire on an empty database).

// Presentation fields (where a service is shown, and its card decoration).
{
  const services = getSetting('services') || {};
  let changed = false;
  for (const [key, svc] of Object.entries(services)) {
    const seed = SEED_SERVICES[key] || {};
    for (const [field, fallback] of [['section', 'cards'], ['icon', '•'], ['tag', '']]) {
      if (svc[field] === undefined) { svc[field] = seed[field] ?? fallback; changed = true; }
    }
  }
  if (changed) setSetting('services', services);
}

// Homepage wording. Only fills gaps — anything already edited is left alone.
{
  const copy = getSetting('copy') || {};
  const missing = Object.entries(SEED_COPY).filter(([k]) => copy[k] === undefined);
  if (missing.length) {
    // The headline used to be one field; split it so the accent half stays styled.
    if (copy.heroTitle && copy.heroAccent === undefined) {
      const [, head, accent] = /^(.*?)\s*(whatever you go through\.?)$/i.exec(copy.heroTitle) || [];
      if (accent) { copy.heroTitle = head; copy.heroAccent = accent; }
    }
    for (const [k, v] of missing) if (copy[k] === undefined) copy[k] = v;
    setSetting('copy', copy);
  }
}
