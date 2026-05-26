import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { unauthorized } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { authRequired } from '../../middleware/auth.js';
import type { UserRole } from '@sahelwaga/shared';

const router: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signTokens(payload: { sub: string; email: string; role: UserRole; supplierId: string | null; clientId: string | null }) {
  const access = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
  const refresh = jwt.sign({ sub: payload.sub }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
  });
  return { access, refresh };
}

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

  const tokens = signTokens({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    supplierId: user.supplierId,
    clientId: user.clientId,
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
    ...tokens,
  });
});

const refreshSchema = z.object({ refresh: z.string().min(1) });

router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const { refresh } = req.body as z.infer<typeof refreshSchema>;
  let sub: string;
  try {
    const decoded = jwt.verify(refresh, config.JWT_REFRESH_SECRET) as { sub: string };
    sub = decoded.sub;
  } catch {
    throw unauthorized('Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user || !user.isActive) throw unauthorized();

  const tokens = signTokens({
    sub: user.id,
    email: user.email,
    role: user.role as UserRole,
    supplierId: user.supplierId,
    clientId: user.clientId,
  });
  res.json(tokens);
});

router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
  if (!user) throw unauthorized();
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale });
});

export { router as authRouter };
