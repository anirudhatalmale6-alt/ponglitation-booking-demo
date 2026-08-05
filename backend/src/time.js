import { CONFIG } from './config.js';

// Current date in the business timezone, as 'YYYY-MM-DD'.
export function todayCT() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CONFIG.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()); // en-CA gives YYYY-MM-DD
}

// Weekday (0=Sun..6=Sat) for a 'YYYY-MM-DD' string, timezone-independent.
export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 'YYYY-MM-DD' one calendar day after another.
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Human label, e.g. "Tuesday, August 11, 2026".
export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
