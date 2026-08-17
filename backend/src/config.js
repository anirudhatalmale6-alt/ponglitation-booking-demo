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
  // Where booking/enquiry alerts go. Defaults to the sending mailbox, so it
  // works out of the box once SMTP is configured.
  ownerEmail: process.env.OWNER_EMAIL || process.env.SMTP_USER || '',
  // How many hours before a session the reminder should go out.
  reminderLeadHours: 24,
};

// Default catalogue — seeded into the DB on first run, then editable from the
// admin dashboard (no code needed).
// A price of 0 means "quoted per event" rather than free — see publicServices().
export const SEED_SERVICES = {
  motivation: { name: 'Motivational Session', price: 45, unit: '60 min', type: 'timed',
                desc: 'One-on-one mindset & momentum' },
  speaking:   { name: 'Speaking & Motivation', price: 0, unit: 'talks & keynotes', type: 'enquiry',
                desc: 'Book Leo to speak to your team, club or audience' },
  schools:    { name: 'Schools & Organizations', price: 0, unit: 'workshops & clinics', type: 'enquiry',
                desc: 'Youth workshops, clinics, demos & community events' },
  lesson:     { name: 'Book Leo', price: 70, unit: '60 min', type: 'timed',
                desc: 'One-on-one at the table with Leo, all levels' },
  group:      { name: 'Motivational Group', price: 40, unit: 'per hour', type: 'enquiry',
                desc: 'Grow together, in a group setting' },
  bookclub:   { name: 'Book Club', price: 30, unit: 'per month', type: 'enquiry',
                desc: 'Read, reflect & rise — monthly membership' },
};

// Answers offered for "What are you booking Leo for?" on the booking form, and
// shown as topic lists on the site. Editable from the dashboard.
export const SEED_TOPICS = [
  { group: 'Speaking & Motivation',
    items: ['Discipline & consistency', 'Athlete mindset', 'Overcoming setbacks',
            'Building confidence', 'Youth entrepreneurship', 'The PongLiTation journey'] },
  { group: 'Schools & Organizations',
    items: ['Table tennis demonstrations', 'Youth workshops', 'Motivational sessions',
            'Table tennis clinics', 'Community events'] },
  { group: 'One-on-one & groups',
    items: ['Motivational session', 'Table tennis coaching with Leo',
            'Motivational group', 'Book club'] },
];

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
