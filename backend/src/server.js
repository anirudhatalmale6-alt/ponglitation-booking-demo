import express from 'express';
import cookieParser from 'cookie-parser';
import { randomUUID, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { CONFIG } from './config.js';
import { db, getSetting, setSetting, dataDir } from './db.js';
import { todayCT, weekdayOf, addDays, isValidDateStr, prettyDate } from './time.js';
import { sendConfirmation, sendReminder, emailMode } from './email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(join(__dirname, '..', 'public')));

// ---------------- availability ----------------
function availability(date) {
  const schedule = getSetting('schedule');
  const blocked = getSetting('blockedDates') || [];
  if (!isValidDateStr(date)) return { open: false, slots: [], reason: 'invalid' };
  if (date < todayCT()) return { open: false, slots: [], reason: 'past' };
  if (blocked.includes(date)) return { open: false, slots: [], reason: 'blocked' };
  const base = schedule[weekdayOf(date)] || [];
  const taken = db.prepare(
    "SELECT time FROM bookings WHERE date=? AND status='booked' AND is_enquiry=0"
  ).all(date).map((r) => r.time);
  return { open: base.length > 0, slots: base.map((t) => ({ time: t, taken: taken.includes(t) })) };
}

function publicServices() {
  const s = getSetting('services');
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, {
    name: v.name, price: `$${v.price}`, unit: v.unit, type: v.type, desc: v.desc,
  }]));
}

// ---------------- public API ----------------
app.get('/api/config', (_req, res) => {
  res.json({
    services: publicServices(),
    schedule: getSetting('schedule'),
    blockedDates: getSetting('blockedDates') || [],
    copy: getSetting('copy'),
    tz: CONFIG.tzLabel,
    today: todayCT(),
  });
});

app.get('/api/availability', (req, res) => {
  res.json(availability(String(req.query.date || '')));
});

const insertBooking = db.prepare(`
  INSERT INTO bookings(ref, service_key, service_name, is_enquiry, date, time, name, email, phone, notes, status, created_at)
  VALUES(@ref,@service_key,@service_name,@is_enquiry,@date,@time,@name,@email,@phone,@notes,'booked',@created_at)
`);

app.post('/api/book', async (req, res) => {
  try {
    const { service, date, time, name, email, phone, notes } = req.body || {};
    const services = getSetting('services');
    const svc = services[service];
    if (!svc) return res.status(400).json({ error: 'Unknown service.' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });

    const isEnquiry = svc.type === 'enquiry' ? 1 : 0;
    let d = date || null, t = time || null;

    if (!isEnquiry) {
      if (!isValidDateStr(d)) return res.status(400).json({ error: 'Please choose a date.' });
      const avail = availability(d);
      const slot = avail.slots.find((s) => s.time === t);
      if (!avail.open || !slot) return res.status(400).json({ error: 'That time is not available.' });
      if (slot.taken) return res.status(409).json({ error: 'Sorry, that slot was just taken. Please pick another.' });
    } else {
      if (d && !isValidDateStr(d)) d = null;
      t = null;
    }

    const ref = 'PL-' + randomBytes(3).toString('hex').toUpperCase();
    const row = {
      ref, service_key: service, service_name: svc.name, is_enquiry: isEnquiry,
      date: d, time: t, name: String(name).trim(), email: String(email).trim(),
      phone: phone ? String(phone).trim() : null, notes: notes ? String(notes).trim() : null,
      created_at: new Date().toISOString(),
    };

    try {
      insertBooking.run(row);
    } catch (e) {
      if (String(e.message).includes('uniq_active_slot'))
        return res.status(409).json({ error: 'Sorry, that slot was just taken. Please pick another.' });
      throw e;
    }

    let email_status = 'queued';
    try { const r = await sendConfirmation(row); email_status = r.mode; }
    catch (e) { email_status = 'failed'; console.error('email error', e.message); }

    res.json({ ok: true, ref, isEnquiry: !!isEnquiry, date: d, time: t,
      prettyDate: d ? prettyDate(d) : null, tz: CONFIG.tzLabel, email_status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ---------------- admin auth ----------------
const sessions = new Set();
function requireAdmin(req, res, next) {
  const tok = req.cookies?.pl_admin;
  if (tok && sessions.has(tok)) return next();
  return res.status(401).json({ error: 'Not authorised.' });
}

app.post('/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== CONFIG.adminPassword) return res.status(401).json({ error: 'Wrong password.' });
  const tok = randomUUID();
  sessions.add(tok);
  res.cookie('pl_admin', tok, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000 });
  res.json({ ok: true });
});
app.post('/admin/logout', (req, res) => {
  const tok = req.cookies?.pl_admin; if (tok) sessions.delete(tok);
  res.clearCookie('pl_admin'); res.json({ ok: true });
});

// ---------------- admin API ----------------
app.get('/admin/api/state', requireAdmin, (_req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500').all();
  res.json({
    bookings,
    services: getSetting('services'),
    schedule: getSetting('schedule'),
    blockedDates: getSetting('blockedDates'),
    copy: getSetting('copy'),
    emailMode, today: todayCT(),
  });
});

app.post('/admin/api/booking/:id/cancel', requireAdmin, (req, res) => {
  db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// Permanently remove a cancelled/test booking so the list stays clean.
app.post('/admin/api/booking/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/admin/api/service', requireAdmin, (req, res) => {
  const { key, price, name, unit, desc } = req.body || {};
  const services = getSetting('services');
  if (!services[key]) return res.status(400).json({ error: 'Unknown service.' });
  if (price != null) services[key].price = Number(price);
  if (name) services[key].name = name;
  if (unit) services[key].unit = unit;
  if (desc) services[key].desc = desc;
  setSetting('services', services);
  res.json({ ok: true, services });
});

// Replace the whole catalogue at once — also lets the running order change,
// since the site lists services in the order they are stored.
app.post('/admin/api/services', requireAdmin, (req, res) => {
  const incoming = req.body || {};
  const keys = Object.keys(incoming);
  if (!keys.length) return res.status(400).json({ error: 'No services supplied.' });
  const clean = {};
  for (const k of keys) {
    const v = incoming[k] || {};
    if (!v.name || !v.unit || !['timed', 'enquiry'].includes(v.type))
      return res.status(400).json({ error: `Bad service: ${k}` });
    clean[k] = {
      name: String(v.name), price: Number(v.price), unit: String(v.unit),
      type: v.type, desc: String(v.desc || ''),
    };
  }
  setSetting('services', clean);
  res.json({ ok: true, services: clean });
});

app.post('/admin/api/schedule', requireAdmin, (req, res) => {
  const { weekday, times } = req.body || {};
  const schedule = getSetting('schedule');
  if (weekday == null || !Array.isArray(times)) return res.status(400).json({ error: 'Bad request.' });
  schedule[weekday] = times;
  setSetting('schedule', schedule);
  res.json({ ok: true, schedule });
});

app.post('/admin/api/block', requireAdmin, (req, res) => {
  const { date, blocked } = req.body || {};
  if (!isValidDateStr(date)) return res.status(400).json({ error: 'Bad date.' });
  let list = getSetting('blockedDates') || [];
  if (blocked) { if (!list.includes(date)) list.push(date); }
  else list = list.filter((d) => d !== date);
  setSetting('blockedDates', list);
  res.json({ ok: true, blockedDates: list });
});

app.post('/admin/api/copy', requireAdmin, (req, res) => {
  const copy = { ...getSetting('copy'), ...(req.body || {}) };
  setSetting('copy', copy);
  res.json({ ok: true, copy });
});

// List generated emails (outbox mode) so the client can preview them.
app.get('/admin/api/outbox', requireAdmin, (_req, res) => {
  try {
    const dir = join(dataDir, 'outbox');
    const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort().reverse().slice(0, 50);
    res.json({ emailMode, files });
  } catch { res.json({ emailMode, files: [] }); }
});
app.get('/admin/api/outbox/:file', requireAdmin, (req, res) => {
  const safe = req.params.file.replace(/[^a-z0-9._-]/gi, '');
  try { res.type('html').send(readFileSync(join(dataDir, 'outbox', safe), 'utf8')); }
  catch { res.status(404).send('Not found'); }
});

// ---------------- reminder loop ----------------
async function runReminders() {
  try {
    const target = addDays(todayCT(), 1); // one-day-ahead reminders
    const due = db.prepare(
      "SELECT * FROM bookings WHERE status='booked' AND is_enquiry=0 AND reminder_sent=0 AND date=?"
    ).all(target);
    for (const b of due) {
      try { await sendReminder(b); db.prepare('UPDATE bookings SET reminder_sent=1 WHERE id=?').run(b.id); }
      catch (e) { console.error('reminder failed', b.ref, e.message); }
    }
    if (due.length) console.log(`Sent ${due.length} reminder(s) for ${target}`);
  } catch (e) { console.error('reminder loop', e.message); }
}
setInterval(runReminders, 15 * 60 * 1000);
setTimeout(runReminders, 4000);

// Friendly URLs for the owner dashboard.
app.get(['/admin', '/dashboard'], (_req, res) => res.redirect('/admin.html'));

app.get('/healthz', (_req, res) =>
  res.json({ ok: true, emailMode, dataDir, persistent: Boolean(process.env.DATA_DIR) }));

app.listen(CONFIG.port, () => {
  console.log(`PongLiTation booking engine on :${CONFIG.port} (email: ${emailMode})`);
});
