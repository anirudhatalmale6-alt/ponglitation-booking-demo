import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { CONFIG } from './config.js';
import { prettyDate } from './time.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outbox = join(__dirname, '..', 'data', 'outbox');
mkdirSync(outbox, { recursive: true });

// Real SMTP if configured; otherwise a "file" transport that writes each email
// to data/outbox/ so the whole flow is testable without credentials.
const usingSmtp = Boolean(CONFIG.smtp.host && CONFIG.smtp.user);
const transport = usingSmtp
  ? nodemailer.createTransport({
      host: CONFIG.smtp.host,
      port: CONFIG.smtp.port,
      secure: CONFIG.smtp.port === 465,
      auth: { user: CONFIG.smtp.user, pass: CONFIG.smtp.pass },
    })
  : null;

export const emailMode = usingSmtp ? 'smtp' : 'outbox';

let counter = 0;
async function deliver(to, subject, html) {
  if (transport) {
    await transport.sendMail({ from: CONFIG.smtp.from, to, subject, html });
    return { mode: 'smtp' };
  }
  // Fallback: write to disk. Deterministic-ish name for tests.
  counter += 1;
  const safe = to.replace(/[^a-z0-9]/gi, '_');
  const file = join(outbox, `${Date.now()}_${counter}_${safe}.html`);
  writeFileSync(file, `<!-- To: ${to} | Subject: ${subject} -->\n${html}`);
  return { mode: 'outbox', file };
}

const shell = (body) => `
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#2c2b28">
  <div style="padding:22px 26px;border-bottom:3px solid #5f7350">
    <span style="font-family:Sora,Arial,sans-serif;font-weight:800;font-size:20px;color:#2c2b28">ponglitation</span>
  </div>
  <div style="padding:26px">${body}</div>
  <div style="padding:18px 26px;border-top:1px solid #e8e3d7;color:#7a776d;font-size:12px">
    Rooted · Rising · Unstoppable &nbsp;·&nbsp; You are never growing alone.
  </div>
</div>`;

const firstName = (n) => (n || '').trim().split(' ')[0] || 'there';

export function confirmationEmail(b) {
  const when = b.is_enquiry
    ? (b.date ? `starting around <b>${prettyDate(b.date)}</b>` : 'soon')
    : `for <b>${prettyDate(b.date)}</b> at <b>${b.time} ${CONFIG.tzLabel}</b>`;
  const body = `
    <p style="font-family:Sora,Arial,sans-serif;font-weight:700;font-size:18px;margin:0 0 12px">
      Hi ${firstName(b.name)},</p>
    <p style="font-size:15px;line-height:1.6">
      ${b.is_enquiry
        ? `Thanks for your interest in the <b>${b.service_name}</b>. We received your request ${when} and will be in touch very soon to get you started.`
        : `Your <b>${b.service_name}</b> is confirmed ${when}.`}
    </p>
    <div style="background:#f5f2ea;border-radius:12px;padding:16px 18px;margin:18px 0;font-size:14px">
      <div><b>Booking ref:</b> ${b.ref}</div>
      <div><b>What:</b> ${b.service_name}</div>
      ${b.date ? `<div><b>When:</b> ${prettyDate(b.date)}${b.time ? ` at ${b.time} ${CONFIG.tzLabel}` : ''}</div>` : ''}
    </div>
    ${b.is_enquiry ? '' :
      `<p style="font-size:14px;color:#7a776d">⏰ You'll get an automatic reminder before your session. Just reply to this email if you need to reschedule.</p>`}
    <p style="font-size:15px;margin-top:18px">Keep growing,<br>— PongLiTation</p>`;
  return {
    subject: b.is_enquiry ? 'We received your request — PongLiTation'
                          : `Your PongLiTation booking is confirmed (${b.ref})`,
    html: shell(body),
  };
}

export function reminderEmail(b) {
  const body = `
    <p style="font-family:Sora,Arial,sans-serif;font-weight:700;font-size:18px;margin:0 0 12px">
      Hi ${firstName(b.name)}, this is your reminder.</p>
    <p style="font-size:15px;line-height:1.6">
      Your <b>${b.service_name}</b> is coming up on <b>${prettyDate(b.date)}</b> at
      <b>${b.time} ${CONFIG.tzLabel}</b>. Show up as you are — that's enough.
    </p>
    <div style="background:#f5f2ea;border-radius:12px;padding:16px 18px;margin:18px 0;font-size:14px">
      <div><b>Booking ref:</b> ${b.ref}</div>
    </div>
    <p style="font-size:14px;color:#7a776d">Need to move it? Just reply to this email.</p>
    <p style="font-size:15px;margin-top:18px">See you soon,<br>— PongLiTation</p>`;
  return { subject: `Reminder: your ${b.service_name} is coming up`, html: shell(body) };
}

export async function sendConfirmation(b) {
  const { subject, html } = confirmationEmail(b);
  return deliver(b.email, subject, html);
}
export async function sendReminder(b) {
  const { subject, html } = reminderEmail(b);
  return deliver(b.email, subject, html);
}
