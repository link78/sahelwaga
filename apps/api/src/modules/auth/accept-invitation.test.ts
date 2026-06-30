import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Required env (must be set before app graph loads).
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'y'.repeat(32);

const prismaMock = {
  portalInvitation: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
  // $transaction(fn) runs the callback against a minimal tx proxy.
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      user: prismaMock.user,
      portalInvitation: prismaMock.portalInvitation,
    });
  }),
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(false),
  },
}));

const { createApp } = await import('../../app.js');
const { hashInvitationToken } = await import(
  '../portal-invitations/portal-invitations.routes.js'
);
const app = createApp();

beforeEach(() => {
  prismaMock.portalInvitation.findUnique.mockReset();
  prismaMock.portalInvitation.update.mockReset().mockResolvedValue({});
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.create.mockReset();
  prismaMock.refreshToken.create.mockReset();
  prismaMock.auditLog.create.mockReset().mockResolvedValue({});
  prismaMock.$transaction.mockClear();
});

describe('POST /auth/accept-invitation', () => {
  it('rejects payloads that fail zod validation (password too short)', async () => {
    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 'abc', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('returns 400 for an unknown token', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 'unknown-token', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
    // Lookup must be by SHA-256 hash, never the raw token.
    expect(prismaMock.portalInvitation.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashInvitationToken('unknown-token') },
    });
  });

  it('returns 400 for non-pending invitations (already accepted/revoked)', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'ACCEPTED',
      email: 'a@b.test',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 't', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer valid/i);
  });

  it('returns 400 and marks the invitation EXPIRED when past expiresAt', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'PENDING',
      email: 'a@b.test',
      expiresAt: new Date(Date.now() - 60_000),
    });
    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 't', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
    expect(prismaMock.portalInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }),
    );
  });

  it('returns 400 if a user already exists for the email (race-safe)', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'PENDING',
      email: 'a@b.test',
      name: 'A',
      role: 'CLIENT_PORTAL',
      supplierId: null,
      clientId: 'cli-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-existing' });
    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 't', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('creates the user, marks the invitation ACCEPTED, and issues a session', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'PENDING',
      email: 'a@b.test',
      name: 'Alice',
      role: 'CLIENT_PORTAL',
      supplierId: null,
      clientId: 'cli-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-new',
      email: 'a@b.test',
      name: 'Alice',
      role: 'CLIENT_PORTAL',
      supplierId: null,
      clientId: 'cli-1',
      locale: 'en',
    });
    prismaMock.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const res = await request(app)
      .post('/auth/accept-invitation')
      .send({ token: 't', password: 'longenough' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      id: 'user-new',
      email: 'a@b.test',
      role: 'CLIENT_PORTAL',
    });
    expect(typeof res.body.access).toBe('string');
    expect(typeof res.body.refresh).toBe('string');

    // The user was created with the bcrypt-hashed password (not the raw one).
    const userCreate = prismaMock.user.create.mock.calls[0][0];
    expect(userCreate.data.email).toBe('a@b.test');
    expect(userCreate.data.passwordHash).toBe('hashed-password');
    expect(userCreate.data.isActive).toBe(true);
    expect(userCreate.data.role).toBe('CLIENT_PORTAL');

    // The invitation must be flipped to ACCEPTED inside the same transaction.
    const invUpdate = prismaMock.portalInvitation.update.mock.calls.find(
      (c) => c[0]?.data?.status === 'ACCEPTED',
    );
    expect(invUpdate).toBeTruthy();
    expect(invUpdate![0].data.acceptedUserId).toBe('user-new');
    expect(invUpdate![0].data.acceptedAt instanceof Date).toBe(true);

    // Auth cookies must be set on the response.
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.join(';')).toMatch(/sahel_access=/);
    expect(setCookie.join(';')).toMatch(/sahel_refresh=/);
  });
});
