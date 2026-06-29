import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// SMTP mailer. Configured lazily from env vars so the API can boot without
// SMTP credentials (in which case sendMail() becomes a no-op and just logs).
// All errors are caught and logged — callers should treat email as
// best-effort and never let a delivery failure abort a request.
// ---------------------------------------------------------------------------

let cached: Transporter | null = null;
let cacheKey = '';

function buildTransporter(): Transporter | null {
  if (!config.SMTP_HOST) return null;
  // Port 465 is implicit TLS; everything else (587, 25, 2525, ...) starts
  // plain and upgrades via STARTTLS. Allow an explicit override.
  const secure =
    typeof config.SMTP_SECURE === 'boolean' ? config.SMTP_SECURE : config.SMTP_PORT === 465;
  const auth =
    config.SMTP_USER && config.SMTP_PASS
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined;
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure,
    auth,
  });
}

export function getTransporter(): Transporter | null {
  const key = [
    config.SMTP_HOST ?? '',
    String(config.SMTP_PORT),
    config.SMTP_USER ?? '',
    config.SMTP_PASS ?? '',
    String(config.SMTP_SECURE ?? ''),
  ].join('|');
  if (cached && cacheKey === key) return cached;
  cached = buildTransporter();
  cacheKey = key;
  return cached;
}

export interface MailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  from?: string;
}

/**
 * Best-effort email send. Returns true when the message was handed off to the
 * SMTP server, false when the mailer is unconfigured or the send failed.
 * Never throws.
 */
export async function sendMail(msg: MailMessage): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.debug({ to: msg.to, subject: msg.subject }, 'SMTP not configured; skipping sendMail');
    return false;
  }
  const from = msg.from ?? config.SMTP_FROM;
  if (!from) {
    logger.warn('sendMail called but neither msg.from nor SMTP_FROM is set; skipping');
    return false;
  }
  try {
    await transporter.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      replyTo: msg.replyTo,
    });
    return true;
  } catch (err) {
    logger.error({ err, to: msg.to, subject: msg.subject }, 'sendMail failed');
    return false;
  }
}

// Test hook: reset the cached transporter so env changes take effect.
export function _resetMailerForTests(): void {
  cached = null;
  cacheKey = '';
}
