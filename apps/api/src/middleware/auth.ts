import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { UserRole } from '@sahelwaga/shared';
import { RBAC } from '@sahelwaga/shared';

export interface AuthPayload {
  sub: string;
  email: string;
  role: UserRole;
  supplierId?: string | null;
  clientId?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

/** Require any of the given roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };
}

/** Enforce RBAC matrix for a module (read/write). */
export function requireCapability(module: keyof typeof RBAC, action: 'read' | 'write') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw unauthorized();
    const allowed = RBAC[module]?.[action];
    if (!allowed || !allowed.includes(req.auth.role)) throw forbidden();
    next();
  };
}
