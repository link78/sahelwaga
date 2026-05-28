import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { authRequired } from '../../middleware/auth.js';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from '../../middleware/cookies.js';
import {
  consumeRefreshToken,
  issueRefreshToken,
  revokeRefreshToken,
} from '../../lib/refresh-tokens.js';
import { parseDurationToMs } from '../../lib/duration.js';
import { authLoginTotal, authRefreshTotal } from '../../lib/metrics.js';
import { logger } from '../../lib/logger.js';
import type { UserRole } from '@sahelwaga/shared';

const router: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signAccessToken(payload: {
  sub: string;
  email: string;
  role: UserRole;
  supplierId: string | null;
  clientId: string | null;
}): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

function refreshTtlMs(): number {
  return parseDurationToMs(config.JWT_REFRESH_TTL) ?? 7 * 86_400_000;
}

function clientIp(req: { ip?: string; headers: Record<string, unknown> }): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0]!.trim();
  return req.ip ?? null;
}

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    authLoginTotal.inc({ outcome: 'invalid' });
    throw unauthorized('Invalid credentials');
  }
  if (!user.isActive) {
    authLoginTotal.inc({ outcome: 'inactive' });
    throw unauthorized('Invalid credentials');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    authLoginTotal.inc({ outcome: 'invalid' });
    throw unauthorized('Invalid credentials');
  }

  const access = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    supplierId: user.supplierId,
    clientId: user.clientId,
  });
  const refresh = await issueRefreshToken({
    userId: user.id,
    ttlMs: refreshTtlMs(),
    ip: clientIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  });

  setAuthCookies(res, { access, refresh: refresh.token });
  authLoginTotal.inc({ outcome: 'success' });
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      locale: user.locale,
    },
    access,
    refresh: refresh.token,
  });
});

const refreshSchema = z.object({ refresh: z.string().min(1).optional() });

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const body = req.body as z.infer<typeof refreshSchema>;
  const cookieJar = (req as { cookies?: Record<string, string> }).cookies ?? {};
  const presented = body.refresh ?? cookieJar[REFRESH_COOKIE];
  if (!presented) {
    authRefreshTotal.inc({ outcome: 'invalid' });
    throw unauthorized('Invalid refresh token');
  }

  const outcome = await consumeRefreshToken(presented, {
    ttlMs: refreshTtlMs(),
    ip: clientIp(req),
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  });
  if (!outcome.ok) {
    authRefreshTotal.inc({ outcome: outcome.reason });
    if (outcome.reason === 'reused') {
      logger.warn('refresh-token reuse: clearing client cookies');
    }
    clearAuthCookies(res);
    throw unauthorized('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: outcome.userId } });
  if (!user || !user.isActive) {
    authRefreshTotal.inc({ outcome: 'invalid' });
    clearAuthCookies(res);
    throw unauthorized();
  }

  const access = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    supplierId: user.supplierId,
    clientId: user.clientId,
  });
  setAuthCookies(res, { access, refresh: outcome.next.token });
  authRefreshTotal.inc({ outcome: 'success' });
  res.json({ access, refresh: outcome.next.token });
});

router.post('/logout', async (req, res) => {
  const body = (req.body ?? {}) as { refresh?: string };
  const cookieJar = (req as { cookies?: Record<string, string> }).cookies ?? {};
  const presented = body.refresh ?? cookieJar[REFRESH_COOKIE];
  if (presented) {
    await revokeRefreshToken(presented);
  }
  clearAuthCookies(res);
  res.status(204).end();
});

router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
  if (!user) throw unauthorized();
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale });
});

export { router as authRouter };
