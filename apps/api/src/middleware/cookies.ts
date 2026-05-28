import type { CookieOptions, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { config } from '../config/env.js';
import { forbidden } from '../lib/errors.js';
import { csrfBlockedTotal } from '../lib/metrics.js';
import { parseDurationToMs } from '../lib/duration.js';

/** Cookie names. Prefixed `sahel_` to be obvious in dev tools. */
export const ACCESS_COOKIE = 'sahel_access';
export const REFRESH_COOKIE = 'sahel_refresh';
export const CSRF_COOKIE = 'sahel_csrf';
export const CSRF_HEADER = 'x-csrf-token';

function baseOpts(): CookieOptions {
  return {
    secure: config.AUTH_COOKIE_SECURE,
    sameSite: config.AUTH_COOKIE_SAMESITE,
    domain: config.AUTH_COOKIE_DOMAIN,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { access: string; refresh: string },
): void {
  const accessMaxAge = parseDurationToMs(config.JWT_ACCESS_TTL) ?? 15 * 60_000;
  const refreshMaxAge = parseDurationToMs(config.JWT_REFRESH_TTL) ?? 7 * 86_400_000;
  res.cookie(ACCESS_COOKIE, tokens.access, {
    ...baseOpts(),
    httpOnly: true,
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    ...baseOpts(),
    httpOnly: true,
    maxAge: refreshMaxAge,
  });
  // CSRF cookie is *not* HttpOnly on purpose: the browser JS must read it to
  // mirror the value into the X-CSRF-Token header (double-submit pattern).
  res.cookie(CSRF_COOKIE, randomBytes(32).toString('base64url'), {
    ...baseOpts(),
    httpOnly: false,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts = baseOpts();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false });
}

/** Constant-time equality for two strings (UTF-8 byte compare). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set<string>(['/auth/login']);

/**
 * CSRF protection for cookie-authenticated mutating requests (double-submit
 * cookie pattern).
 *
 * - Safe methods (GET/HEAD/OPTIONS) are never checked.
 * - Requests authenticated with `Authorization: Bearer` (existing flow) are
 *   not vulnerable to CSRF — browsers don't auto-attach Authorization headers
 *   to cross-site requests — so they are exempt.
 * - Requests that present an auth cookie MUST also send a matching
 *   `X-CSRF-Token` header equal to the `sahel_csrf` cookie value.
 * - `POST /auth/login` is the single exempt path: it cannot present a CSRF
 *   token (no session yet) and a CSRF attack against an *unauthenticated*
 *   login endpoint cannot escalate privileges.
 *
 * Note: must be installed AFTER `cookieParser()` and BEFORE protected routes.
 */
export function csrfProtection(req: Request, _res: Response, next: () => void): void {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();

  const hasAuthHeader = typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ');
  if (hasAuthHeader) return next();

  // Use cookies object set by cookie-parser
  const cookieJar = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  const accessCookie = cookieJar[ACCESS_COOKIE];
  const refreshCookie = cookieJar[REFRESH_COOKIE];
  if (!accessCookie && !refreshCookie) {
    // Not a cookie-authenticated request — nothing to defend.
    return next();
  }

  const csrfCookie = cookieJar[CSRF_COOKIE];
  const csrfHeader = req.headers[CSRF_HEADER];
  const headerValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
  if (!csrfCookie || !headerValue || !safeEqual(csrfCookie, String(headerValue))) {
    csrfBlockedTotal.inc({ route: req.path });
    throw forbidden('CSRF token missing or invalid');
  }
  next();
}
