import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Required env for config validation. Must be set before the app module
// graph is loaded.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'y'.repeat(32);

// In-memory mock for prisma — only the methods touched by the route are
// stubbed. Each test sets the return values it cares about.
const prismaMock = {
  portalInvitation: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  supplier: { findFirst: vi.fn() },
  client: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
};

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../lib/mailer.js', () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));

const { createApp } = await import('../../app.js');
const { hashInvitationToken } = await import('./portal-invitations.routes.js');
const app = createApp();

function tokenFor(role: string, sub = 'u-1'): string {
  return jwt.sign(
    { sub, email: sub + '@example.com', role, supplierId: null, clientId: null },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '5m' },
  );
}

function asAdmin(req: ReturnType<typeof request>['get']) {
  return req.auth(tokenFor('ADMIN'), { type: 'bearer' });
}

beforeEach(() => {
  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe('GET /portal-invitations', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/portal-invitations');
    expect(res.status).toBe(401);
  });

  it('forbids non-admin roles (RBAC)', async () => {
    const res = await request(app)
      .get('/portal-invitations')
      .auth(tokenFor('SALES'), { type: 'bearer' });
    expect(res.status).toBe(403);
  });

  it('returns paginated invitations with tokenHash stripped', async () => {
    prismaMock.portalInvitation.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        email: 'a@b.test',
        name: 'Alice',
        role: 'SUPPLIER_PORTAL',
        status: 'PENDING',
        supplierId: 'sup-1',
        clientId: null,
        tokenHash: 'SECRET-HASH-MUST-NOT-LEAK',
        expiresAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    prismaMock.portalInvitation.count.mockResolvedValue(1);

    const res = await asAdmin(request(app).get('/portal-invitations?page=1&pageSize=10'));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).not.toHaveProperty('tokenHash');
    expect(JSON.stringify(res.body)).not.toContain('SECRET-HASH-MUST-NOT-LEAK');
  });

  it('forwards status/supplierId/q filters into the prisma where clause', async () => {
    prismaMock.portalInvitation.findMany.mockResolvedValue([]);
    prismaMock.portalInvitation.count.mockResolvedValue(0);
    await asAdmin(
      request(app).get('/portal-invitations?status=PENDING&supplierId=sup-9&q=ali'),
    );
    const args = prismaMock.portalInvitation.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('PENDING');
    expect(args.where.supplierId).toBe('sup-9');
    expect(args.where.OR).toBeDefined();
  });
});

describe('POST /portal-invitations', () => {
  const validBody = {
    email: 'invitee@example.com',
    name: 'Invitee',
    role: 'SUPPLIER_PORTAL',
    supplierId: 'sup-1',
  };

  it('rejects invalid payload (missing supplierId for SUPPLIER_PORTAL)', async () => {
    const res = await asAdmin(request(app).post('/portal-invitations')).send({
      email: 'x@y.test',
      name: 'n',
      role: 'SUPPLIER_PORTAL',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('returns 404 when supplier does not exist', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null);
    const res = await asAdmin(request(app).post('/portal-invitations')).send(validBody);
    expect(res.status).toBe(404);
  });

  it('returns 409 when an active user already has the email', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue({ id: 'sup-1', name: 'Acme' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
    const res = await asAdmin(request(app).post('/portal-invitations')).send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 409 when a pending invitation already exists', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue({ id: 'sup-1', name: 'Acme' });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.portalInvitation.findFirst.mockResolvedValue({ id: 'inv-old' });
    const res = await asAdmin(request(app).post('/portal-invitations')).send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/pending invitation/i);
  });

  it('creates an invitation, hashes the token, normalises the email, and never returns the token hash', async () => {
    prismaMock.supplier.findFirst.mockResolvedValue({ id: 'sup-1', name: 'Acme' });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.portalInvitation.findFirst.mockResolvedValue(null);
    prismaMock.portalInvitation.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'inv-new',
        ...data,
        supplier: { id: 'sup-1', name: 'Acme' },
        client: null,
      }),
    );

    const res = await asAdmin(request(app).post('/portal-invitations')).send({
      ...validBody,
      email: 'INVITEE@Example.COM',
    });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('tokenHash');
    expect(res.body.email).toBe('invitee@example.com');
    const createArgs = prismaMock.portalInvitation.create.mock.calls[0][0];
    expect(createArgs.data.status).toBe('PENDING');
    expect(typeof createArgs.data.tokenHash).toBe('string');
    expect(createArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.expiresAt instanceof Date).toBe(true);
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('POST /portal-invitations/:id/revoke', () => {
  it('returns 404 if the invitation does not exist', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue(null);
    const res = await asAdmin(request(app).post('/portal-invitations/missing/revoke'));
    expect(res.status).toBe(404);
  });

  it('rejects revoking a non-pending invitation', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'ACCEPTED',
    });
    const res = await asAdmin(request(app).post('/portal-invitations/inv-1/revoke'));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ACCEPTED/);
  });

  it('marks a pending invitation as REVOKED', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'PENDING',
    });
    prismaMock.portalInvitation.update.mockResolvedValue({
      id: 'inv-1',
      status: 'REVOKED',
      tokenHash: 'h',
    });
    const res = await asAdmin(request(app).post('/portal-invitations/inv-1/revoke'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REVOKED');
    expect(res.body).not.toHaveProperty('tokenHash');
    const updateArgs = prismaMock.portalInvitation.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('REVOKED');
    expect(updateArgs.data.revokedAt instanceof Date).toBe(true);
  });
});

describe('POST /portal-invitations/:id/resend', () => {
  it('returns 404 when the invitation does not exist', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue(null);
    const res = await asAdmin(request(app).post('/portal-invitations/missing/resend'));
    expect(res.status).toBe(404);
  });

  it('rejects resending a non-pending invitation', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'REVOKED',
      email: 'a@b.test',
      name: 'A',
      role: 'SUPPLIER_PORTAL',
      supplier: { name: 'Acme' },
      client: null,
    });
    const res = await asAdmin(request(app).post('/portal-invitations/inv-1/resend'));
    expect(res.status).toBe(400);
  });

  it('rotates the token hash and extends expiry on resend', async () => {
    prismaMock.portalInvitation.findUnique.mockResolvedValue({
      id: 'inv-1',
      status: 'PENDING',
      email: 'a@b.test',
      name: 'A',
      role: 'SUPPLIER_PORTAL',
      tokenHash: 'OLD-HASH',
      supplier: { name: 'Acme' },
      client: null,
    });
    prismaMock.portalInvitation.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'inv-1',
        status: 'PENDING',
        ...data,
        supplier: { id: 'sup-1', name: 'Acme' },
        client: null,
      }),
    );

    const res = await asAdmin(request(app).post('/portal-invitations/inv-1/resend'));

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('tokenHash');
    const updateArgs = prismaMock.portalInvitation.update.mock.calls[0][0];
    expect(updateArgs.data.tokenHash).not.toBe('OLD-HASH');
    expect(updateArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(updateArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(updateArgs.data.lastSentAt instanceof Date).toBe(true);
  });
});

describe('hashInvitationToken', () => {
  it('produces a deterministic 64-char sha256 hex digest', () => {
    const a = hashInvitationToken('abc');
    const b = hashInvitationToken('abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken('abd')).not.toBe(a);
  });
});
