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
// `section` decides where a service appears on the homepage: 'speaking' renders
// it as a wide panel with its topic list, 'cards' as a pricing card, 'hidden'
// keeps it bookable by link only. `icon` and `tag` are the card decoration.
export const SEED_SERVICES = {
  motivation: { name: 'Motivational Session', price: 45, unit: '60 min', type: 'timed',
                desc: 'A focused one-on-one to rebuild momentum, mindset and drive — and power through whatever is trying to hold you down.',
                section: 'cards', icon: '🎤', tag: 'Most popular' },
  speaking:   { name: 'Speaking & Motivation', price: 0, unit: 'talks & keynotes', type: 'enquiry',
                desc: 'Keynotes and talks shaped around the moment your audience is actually in.',
                section: 'speaking', icon: '🎤', tag: '' },
  schools:    { name: 'Schools & Organizations', price: 0, unit: 'workshops & clinics', type: 'enquiry',
                desc: 'Hands-on sessions for students, youth programs and community groups.',
                section: 'speaking', icon: '🏫', tag: '' },
  lesson:     { name: 'Book Leo', price: 70, unit: '60 min', type: 'timed',
                desc: 'An hour at the table with Leo — technique, footwork and match play, plus the grit to power through it. All levels welcome.',
                section: 'cards', icon: '🏓', tag: 'One-on-one at the table' },
  group:      { name: 'Motivational Group', price: 40, unit: 'per hour', type: 'enquiry',
                desc: 'Rise alongside others in a group that keeps showing up — because no one should have to grow alone.',
                section: 'cards', icon: '🌱', tag: 'Grow together' },
  bookclub:   { name: 'Book Club', price: 30, unit: 'per month', type: 'enquiry',
                desc: 'Read, reflect and rise together. A monthly membership with a book, a conversation and a push forward.',
                section: 'cards', icon: '📚', tag: 'Monthly membership' },
};

// Where a service can be shown. Used to validate dashboard edits.
export const SERVICE_SECTIONS = ['cards', 'speaking', 'hidden'];

// Homepage wording, seeded once then editable from the dashboard. Every key here
// is painted onto the live page, so adding a key means adding it to the page too.
export const SEED_COPY = {
  heroTitle: 'Grow through',
  heroAccent: 'whatever you go through.',
  heroLead: 'Motivational speaking, one-on-one sessions and youth workshops for anyone rising through something hard — plus table tennis with Leo. Power through it. Keep growing. And never do it alone.',
  speakingEyebrow: 'Bring Leo to your people',
  speakingTitle: 'Speaking, workshops & clinics',
  speakingLead: 'Leo speaks to teams, schools, clubs and communities — the mindset that turns pressure into fuel, told through the PongLiTation journey.',
  speakingNote: 'Every talk, workshop and clinic is quoted per event — send the details and Leo comes back to you personally.',
  servicesEyebrow: 'What we offer',
  servicesTitle: 'Pick your Inspiration!',
  servicesLead: 'One-on-one and small-group options. Every booking sends an instant confirmation and an automatic reminder before your session — no follow-up needed.',
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
