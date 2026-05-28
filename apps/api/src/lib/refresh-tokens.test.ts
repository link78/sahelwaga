import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= '******localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'y'.repeat(32);

/**
 * Minimal in-memory stand-in for the prisma.refreshToken delegate. We keep the
 * surface to just the methods the production code calls and otherwise match
 * Prisma's semantics (unique lookup by `tokenHash`, etc.) closely enough for
 * the rotation / reuse-detection guarantees we want to lock in.
 */
interface Row {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdByIp: string | null;
  userAgent: string | null;
  createdAt: Date;
}

const rows = new Map<string, Row>();
let idSeq = 0;

function makeStub() {
  return {
    refreshToken: {
      create: vi.fn(async ({ data, select }: { data: Partial<Row>; select?: Record<string, boolean> }) => {
        const id = `rt_${++idSeq}`;
        const row: Row = {
          id,
          userId: data.userId!,
          tokenHash: data.tokenHash!,
          expiresAt: data.expiresAt!,
          revokedAt: null,
          replacedById: null,
          createdByIp: data.createdByIp ?? null,
          userAgent: data.userAgent ?? null,
          createdAt: new Date(),
        };
        rows.set(id, row);
        return select ? { id } : row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.get(where.id)!;
        Object.assign(row, data);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Partial<Row> & { revokedAt?: null }; data: Partial<Row> }) => {
        let count = 0;
        for (const row of rows.values()) {
          let match = true;
          for (const [k, v] of Object.entries(where)) {
            if (k === 'revokedAt' && v === null) {
              if (row.revokedAt !== null) match = false;
            } else if ((row as unknown as Record<string, unknown>)[k] !== v) {
              match = false;
            }
          }
          if (match) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      }),
      findUnique: vi.fn(async ({ where, select }: { where: { tokenHash?: string; id?: string }; select?: Record<string, boolean> }) => {
        for (const row of rows.values()) {
          if (where.tokenHash && row.tokenHash !== where.tokenHash) continue;
          if (where.id && row.id !== where.id) continue;
          return select ? { id: row.id, replacedById: row.replacedById, revokedAt: row.revokedAt } : { ...row };
        }
        return null;
      }),
      findFirst: vi.fn(async ({ where }: { where: { replacedById?: string } }) => {
        for (const row of rows.values()) {
          if (where.replacedById && row.replacedById === where.replacedById) {
            return { id: row.id };
          }
        }
        return null;
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

const stub = makeStub();
vi.mock('./prisma.js', () => ({ prisma: stub }));

const { issueRefreshToken, consumeRefreshToken, revokeRefreshToken } = await import('./refresh-tokens.js');

beforeEach(() => {
  rows.clear();
  idSeq = 0;
});

describe('refresh-token rotation', () => {
  it('issues, then rotates a refresh token', async () => {
    const issued = await issueRefreshToken({ userId: 'user_1', ttlMs: 60_000 });
    const outcome = await consumeRefreshToken(issued.token, { ttlMs: 60_000 });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.userId).toBe('user_1');
      expect(outcome.next.token).not.toBe(issued.token);
    }
    // Original token is now revoked
    const reuse = await consumeRefreshToken(issued.token, { ttlMs: 60_000 });
    expect(reuse.ok).toBe(false);
    if (!reuse.ok) expect(reuse.reason).toBe('reused');
  });

  it('detects reuse and revokes the entire descendant family', async () => {
    const a = await issueRefreshToken({ userId: 'user_1', ttlMs: 60_000 });
    const b = await consumeRefreshToken(a.token, { ttlMs: 60_000 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const c = await consumeRefreshToken(b.next.token, { ttlMs: 60_000 });
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    // Replay a (the great-grandparent) — should be flagged as reuse AND the
    // currently-active descendant `c` should also be killed.
    const replay = await consumeRefreshToken(a.token, { ttlMs: 60_000 });
    expect(replay.ok).toBe(false);

    const after = await consumeRefreshToken(c.next.token, { ttlMs: 60_000 });
    expect(after.ok).toBe(false);
  });

  it('rejects an unknown token as invalid', async () => {
    const out = await consumeRefreshToken('totally-bogus', { ttlMs: 60_000 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('invalid');
  });

  it('rejects an expired token', async () => {
    const issued = await issueRefreshToken({ userId: 'user_1', ttlMs: -1 });
    const out = await consumeRefreshToken(issued.token, { ttlMs: 60_000 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('expired');
  });

  it('revokeRefreshToken makes future use look like reuse', async () => {
    const issued = await issueRefreshToken({ userId: 'user_1', ttlMs: 60_000 });
    await revokeRefreshToken(issued.token);
    const out = await consumeRefreshToken(issued.token, { ttlMs: 60_000 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('reused');
  });
});
