import { createHash, randomBytes } from 'crypto';
import { prisma } from './prisma.js';
import { logger } from './logger.js';
import { authRefreshReuseTotal } from './metrics.js';

/**
 * Server-side refresh-token store.
 *
 * Design:
 *   - The opaque token returned to the client is 256 bits of entropy encoded
 *     as base64url. Only the SHA-256 hash of the token is persisted, so a DB
 *     read leak cannot impersonate sessions.
 *   - Tokens are single-use. `consume()` revokes the presented token and
 *     issues a successor, linking parent → child via `replacedById`.
 *   - If a *revoked* token is presented again ("reuse"), the entire descendant
 *     chain is revoked. This is the canonical detection of refresh-token theft
 *     and kicks all known clones out of the system.
 */

const TOKEN_BYTES = 32; // 256 bits

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newOpaque(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export interface IssueOpts {
  userId: string;
  ttlMs: number;
  ip?: string | null;
  userAgent?: string | null;
  replacesId?: string | null;
}

export interface IssuedToken {
  id: string;
  token: string;
  expiresAt: Date;
}

export async function issueRefreshToken(opts: IssueOpts): Promise<IssuedToken> {
  const token = newOpaque();
  const expiresAt = new Date(Date.now() + opts.ttlMs);
  const created = await prisma.refreshToken.create({
    data: {
      userId: opts.userId,
      tokenHash: hash(token),
      expiresAt,
      createdByIp: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
    },
    select: { id: true },
  });
  if (opts.replacesId) {
    await prisma.refreshToken.update({
      where: { id: opts.replacesId },
      data: { replacedById: created.id },
    });
  }
  return { id: created.id, token, expiresAt };
}

export type ConsumeOutcome =
  | { ok: true; userId: string; next: IssuedToken }
  | { ok: false; reason: 'invalid' | 'expired' | 'revoked' | 'reused' };

/**
 * Atomically validate + rotate a refresh token.
 *
 * Returns the new token on success. On `reused`, the entire descendant chain
 * is revoked as a theft-defence measure.
 */
export async function consumeRefreshToken(
  presented: string,
  opts: { ttlMs: number; ip?: string | null; userAgent?: string | null },
): Promise<ConsumeOutcome> {
  if (!presented) return { ok: false, reason: 'invalid' };
  const tokenHash = hash(presented);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record) return { ok: false, reason: 'invalid' };

  if (record.revokedAt) {
    // Reuse of an already-revoked token → assume the session family is
    // compromised and revoke every descendant.
    await revokeFamily(record.id);
    authRefreshReuseTotal.inc();
    logger.warn(
      { refreshTokenId: record.id, userId: record.userId },
      'refresh-token reuse detected; revoking family',
    );
    return { ok: false, reason: 'reused' };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // Revoke current and issue successor.
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  const next = await issueRefreshToken({
    userId: record.userId,
    ttlMs: opts.ttlMs,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
    replacesId: record.id,
  });
  return { ok: true, userId: record.userId, next };
}

/** Revoke a specific token by its opaque value (best-effort). */
export async function revokeRefreshToken(presented: string): Promise<void> {
  if (!presented) return;
  const tokenHash = hash(presented);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every refresh token belonging to a user (e.g. on password reset). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Walk replacedById descendants from `rootId` and revoke them all. */
async function revokeFamily(rootId: string): Promise<void> {
  // Find the original root by walking up — if this token replaced another we
  // start from there so we revoke siblings/ancestors that should not exist.
  let cursor: string | null = rootId;
  const seen = new Set<string>();
  // climb up
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const parent: { id: string } | null = await prisma.refreshToken.findFirst({
      where: { replacedById: cursor },
      select: { id: true },
    });
    cursor = parent?.id ?? null;
  }
  // now descend from every seen id, revoking
  const queue: string[] = Array.from(seen);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = await prisma.refreshToken.findUnique({
      where: { id },
      select: { id: true, replacedById: true, revokedAt: true },
    });
    if (!node) continue;
    if (!node.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: node.id },
        data: { revokedAt: new Date() },
      });
    }
    if (node.replacedById && !seen.has(node.replacedById)) {
      seen.add(node.replacedById);
      queue.push(node.replacedById);
    }
  }
}

/** Best-effort housekeeping: purge expired/revoked records older than `cutoff`. */
export async function purgeOldRefreshTokens(cutoff: Date): Promise<number> {
  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { revokedAt: { not: null, lt: cutoff } },
      ],
    },
  });
  return count;
}
