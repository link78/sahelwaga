import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { UserRole } from '@sahelwaga/shared';
import { RBAC } from '@sahelwaga/shared';
import { ACCESS_COOKIE } from './cookies.js';

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

function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  const cookieJar = (req as Request & { cookies?: Record<string, string> }).cookies;
  const cookieToken = cookieJar?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;
  return null;
}

export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    throw unauthorized('Missing bearer token');
  }
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
