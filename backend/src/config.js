// Central configuration. Secrets come from environment variables in production.
export const CONFIG = {
  port: process.env.PORT || 3000,
  businessName: 'PongLiTation',
  timezone: 'America/Chicago',          // Central Time (client is in Nashville, TN)
  tzLabel: 'CT',
  adminPassword: process.env.ADMIN_PASSWORD || 'ponglitation2026',
  // Email: if SMTP_* are set, real mail is sent. Otherwise mail is written to
  // data/outbox/ as .html so everything is testable without credentials.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'PongLiTation <hello@ponglitation.com>',
  },
  // How many hours before a session the reminder should go out.
  reminderLeadHours: 24,
};

// Default catalogue — seeded into the DB on first run, then editable from the
// admin dashboard (no code needed).
export const SEED_SERVICES = {
  motivation: { name: 'Motivational Session', price: 45, unit: '60 min', type: 'timed',
                desc: 'One-on-one mindset & momentum' },
  lesson:     { name: 'Book Leo', price: 70, unit: '60 min', type: 'timed',
                desc: 'One-on-one at the table with Leo, all levels' },
  group:      { name: 'Motivational Group', price: 40, unit: 'per hour', type: 'enquiry',
                desc: 'Grow together, in a group setting' },
  bookclub:   { name: 'Book Club', price: 30, unit: 'per month', type: 'enquiry',
                desc: 'Read, reflect & rise — monthly membership' },
};

// Weekly availability (Central Time). Keyed by JS weekday: 0=Sun … 6=Sat.
// Mon & Wed 4–7pm · Tue/Thu/Fri 2–5pm · Sat & Sun 8am–12pm.
export const SEED_SCHEDULE = {
  0: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
  1: ['4:00 PM', '5:00 PM', '6:00 PM'],
  2: ['2:00 PM', '3:00 PM', '4:00 PM'],
  3: ['4:00 PM', '5:00 PM', '6:00 PM'],
  4: ['2:00 PM', '3:00 PM', '4:00 PM'],
  5: ['2:00 PM', '3:00 PM', '4:00 PM'],
  6: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
};
