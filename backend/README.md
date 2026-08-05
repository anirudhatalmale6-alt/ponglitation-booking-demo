# PongLiTation — Booking Engine

The live booking backend behind the PongLiTation site: real-time availability,
double-booking protection, automatic confirmation + reminder emails, and a
no-code owner dashboard.

## Run locally

```bash
cd backend
npm install
npm start        # http://localhost:3000  (admin at /admin.html)
```

## Environment variables

| Variable         | Purpose                                             | Default                     |
|------------------|-----------------------------------------------------|-----------------------------|
| `PORT`           | Port to listen on                                   | `3000`                      |
| `ADMIN_PASSWORD` | Password for the owner dashboard                    | `ponglitation2026`          |
| `SMTP_HOST`      | Mail server host (enables live email)               | — (preview mode if unset)   |
| `SMTP_PORT`      | Mail server port                                    | `587`                       |
| `SMTP_USER`      | Mail username                                       | —                           |
| `SMTP_PASS`      | Mail password                                       | —                           |
| `MAIL_FROM`      | "From" address on emails                            | `hello@ponglitation.com`    |

**Email preview mode:** with no SMTP configured, every confirmation and reminder
is generated and saved to `data/outbox/*.html` and viewable from the dashboard's
Emails tab — so the whole flow is testable before mail credentials are wired in.

## What it does

- **Availability** — weekly hours in Central Time (Mon & Wed 4–7pm, Tue/Thu/Fri
  2–5pm, Sat & Sun 8am–12pm), editable from the dashboard.
- **Booking** — a database-level unique index makes double-booking impossible.
- **Enquiries** — Motivational Groups & Book Club come in as enquiries.
- **Emails** — confirmation on booking; a reminder goes out ~24h before a session.
- **Dashboard** (`/admin.html`) — bookings, prices/services, weekly hours, days
  off, and an email preview. No code required.

## Data

SQLite at `backend/data/pongli.db` (created on first run; not committed).

## Deploy

Any Node host works (Render, Railway, Fly, a VPS, etc.). Set the environment
variables above, run `npm install && npm start`, and point the domain at it.
Persist the `backend/data` directory so bookings survive restarts.
