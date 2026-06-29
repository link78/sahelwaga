import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load .env from monorepo root as fallback (dotenv-cli already sets vars in dev scripts)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  // A reverse proxy or platform may inject the listening port via the `PORT`
  // env var. When present it takes precedence over `API_PORT` so the
  // process binds to the port traffic is routed to.
  PORT: z.coerce.number().int().optional(),
  API_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  // Auth cookie / CSRF configuration.
  // When AUTH_COOKIE_SECURE is true (recommended in prod, behind HTTPS) the
  // browser only sends auth cookies over TLS. Set AUTH_COOKIE_DOMAIN when the
  // API and web app are served from different subdomains of the same root
  // (e.g. api.sahelwaga.com / app.sahelwaga.com) and you want the cookie to
  // be sent to both.
  AUTH_COOKIE_SECURE: z.coerce.boolean().default(false),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  // Express `trust proxy` setting. Required when running behind a reverse
  // proxy (nginx, Caddy, Cloudflare, load balancer) so that `req.ip`,
  // `X-Forwarded-For`, and `X-Forwarded-Proto` are honoured. Accepts the
  // same values as Express: a boolean, an integer hop count, or a
  // comma-separated list of trusted IPs/subnets. Defaults to disabled
  // (matches Express default) to avoid spoofing when no proxy is present.
  TRUST_PROXY: z.string().default('false'),
  // --- Outbound email (SMTP) ----------------------------------------------
  // Used to send lead notifications from the public contact form. All
  // SMTP_* vars are optional; when SMTP_HOST is unset the mailer becomes a
  // no-op (lead is still persisted, just no email is sent).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),
  SMTP_FROM: z.string().optional(),
  // Recipient address for lead notifications. Defaults to SMTP_FROM when
  // unset so a single env var is enough for the common case.
  LEAD_NOTIFY_TO: z.string().optional(),
  // Public-facing base URL of the web app (no trailing slash). Used to build
  // invitation acceptance links in transactional emails. Falls back to the
  // first CORS origin when unset.
  WEB_APP_URL: z.string().optional(),
  // TTL for portal invitation tokens (e.g. "7d", "72h"). Defaults to 7 days.
  PORTAL_INVITATION_TTL: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = {
  ...parsed.data,
  // Prefer an externally provided `PORT` over `API_PORT`.
  API_PORT: parsed.data.PORT ?? parsed.data.API_PORT,
  // Split the allowlist and normalise each entry. The browser's `Origin`
  // header is always scheme+host+port with no trailing slash, but operators
  // routinely paste a deployment URL with a trailing slash (e.g.
  // `https://portal.example.com/`). The `cors` package matches the allowlist
  // exactly, so an un-normalised trailing slash would silently drop the
  // `Access-Control-Allow-Origin` header. Strip trailing slashes so both
  // forms work.
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
};

/**
 * Coerce the `TRUST_PROXY` env string into the value Express expects.
 * - "true" / "false" → boolean
 * - integer string → hop count (number)
 * - anything else (IP/subnet list, named preset like "loopback") → string
 */
function parseTrustProxy(raw: string): boolean | number | string {
  const v = raw.trim();
  if (v === '' || v.toLowerCase() === 'false') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
