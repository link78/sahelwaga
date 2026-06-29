import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import {
  paginationSchema,
  portalInvitationStatusSchema,
  createPortalInvitationSchema,
} from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';
import { sendMail } from '../../lib/mailer.js';
import { parseDurationToMs } from '../../lib/duration.js';
import { logger } from '../../lib/logger.js';

const router: Router = Router();
router.use(authRequired);

// 256 bits of entropy, base64url encoded — same convention as refresh tokens.
const TOKEN_BYTES = 32;

function newOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function invitationTtlMs(): number {
  return parseDurationToMs(config.PORTAL_INVITATION_TTL) ?? 7 * 86_400_000;
}

function buildAcceptUrl(token: string): string {
  // Prefer the explicit WEB_APP_URL; otherwise pick the first allowed CORS
  // origin. Both are normalised (no trailing slash) so a clean URL is built.
  const base =
    (config.WEB_APP_URL ?? '').replace(/\/+$/, '') ||
    config.corsOrigins[0] ||
    'http://localhost:3000';
  return `${base}/accept-invitation/${encodeURIComponent(token)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendInvitationEmail(opts: {
  to: string;
  name: string;
  token: string;
  orgName: string;
  scope: 'supplier' | 'client';
  expiresAt: Date;
}): Promise<void> {
  const acceptUrl = buildAcceptUrl(opts.token);
  const scopeLabel = opts.scope === 'supplier' ? 'supplier' : 'client';
  const subject = `You're invited to the MedSupply ${scopeLabel} portal`;
  const text =
    `Hello ${opts.name},\n\n` +
    `You have been invited to access the MedSupply ${scopeLabel} portal as ${opts.orgName}.\n\n` +
    `Accept your invitation and set your password:\n${acceptUrl}\n\n` +
    `This link expires on ${opts.expiresAt.toISOString()}.\n\n` +
    `If you weren't expecting this email you can safely ignore it.`;
  const html =
    `<p>Hello ${escapeHtml(opts.name)},</p>` +
    `<p>You have been invited to access the MedSupply ${scopeLabel} portal as ` +
    `<strong>${escapeHtml(opts.orgName)}</strong>.</p>` +
    `<p><a href="${escapeHtml(acceptUrl)}">Accept your invitation and set your password</a></p>` +
    `<p>This link expires on ${escapeHtml(opts.expiresAt.toISOString())}.</p>` +
    `<p style="color:#888">If you weren't expecting this email you can safely ignore it.</p>`;
  const sent = await sendMail({ to: opts.to, subject, text, html });
  if (!sent) {
    logger.info(
      { to: opts.to, acceptUrl },
      'portal invitation email not sent (SMTP unconfigured or failed); URL available in logs',
    );
  }
}

function stripTokenHash<T extends { tokenHash: string }>(row: T): Omit<T, 'tokenHash'> {
  const copy: Record<string, unknown> = { ...row };
  delete copy.tokenHash;
  return copy as Omit<T, 'tokenHash'>;
}

const idParam = z.object({ id: z.string().min(1) });

const listQuerySchema = paginationSchema.extend({
  status: portalInvitationStatusSchema.optional(),
  supplierId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
});

router.get(
  '/',
  requireCapability('portalInvitations', 'read'),
  validate(listQuerySchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q, status, supplierId, clientId } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;
    const where: Prisma.PortalInvitationWhereInput = {
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.portalInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          supplier: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.portalInvitation.count({ where }),
    ]);
    // Strip the tokenHash from responses — it must never leave the server.
    res.json({ items: items.map(stripTokenHash), page, pageSize, total });
  },
);

router.post(
  '/',
  requireCapability('portalInvitations', 'write'),
  validate(createPortalInvitationSchema),
  async (req, res) => {
    const input = req.body as z.infer<typeof createPortalInvitationSchema>;
    const email = input.email.toLowerCase().trim();

    // Resolve & validate the target org.
    let orgName = '';
    let scope: 'supplier' | 'client';
    if (input.role === 'SUPPLIER_PORTAL') {
      const supplier = await prisma.supplier.findFirst({
        where: { id: input.supplierId!, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!supplier) throw notFound('Supplier not found');
      orgName = supplier.name;
      scope = 'supplier';
    } else {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId!, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!client) throw notFound('Client not found');
      orgName = client.name;
      scope = 'client';
    }

    // Reject if an active user with this email already exists — they should
    // sign in, not be re-invited.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw conflict('A user with this email already exists');
    }

    // Reject if there's already a PENDING invitation for this email — the
    // admin should revoke or resend instead.
    const existingPending = await prisma.portalInvitation.findFirst({
      where: { email, status: 'PENDING' },
    });
    if (existingPending) {
      throw conflict('A pending invitation already exists for this email');
    }

    const token = newOpaqueToken();
    const expiresAt = new Date(Date.now() + invitationTtlMs());
    const created = await prisma.portalInvitation.create({
      data: {
        email,
        name: input.name,
        role: input.role,
        supplierId: input.supplierId ?? null,
        clientId: input.clientId ?? null,
        tokenHash: hashInvitationToken(token),
        expiresAt,
        invitedById: req.auth?.sub ?? null,
        status: 'PENDING',
        lastSentAt: new Date(),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    await sendInvitationEmail({
      to: email,
      name: input.name,
      token,
      orgName,
      scope,
      expiresAt,
    });

    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'PortalInvitation',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: {
        email: created.email,
        role: created.role,
        supplierId: created.supplierId,
        clientId: created.clientId,
      },
    });

    res.status(201).json(stripTokenHash(created));
  },
);

router.post(
  '/:id/revoke',
  requireCapability('portalInvitations', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const inv = await prisma.portalInvitation.findUnique({ where: { id } });
    if (!inv) throw notFound('Invitation not found');
    if (inv.status !== 'PENDING') {
      throw badRequest(`Cannot revoke invitation in status ${inv.status}`);
    }
    const updated = await prisma.portalInvitation.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'PortalInvitation',
      entityId: id,
      action: 'REVOKE',
      before: { status: inv.status },
      after: { status: updated.status },
    });
    res.json(stripTokenHash(updated));
  },
);

router.post(
  '/:id/resend',
  requireCapability('portalInvitations', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const inv = await prisma.portalInvitation.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        client: { select: { name: true } },
      },
    });
    if (!inv) throw notFound('Invitation not found');
    if (inv.status !== 'PENDING') {
      throw badRequest(`Cannot resend invitation in status ${inv.status}`);
    }
    // Rotate the token so any previously emailed link is invalidated. This is
    // the safer default — if the original email was leaked or forwarded, the
    // old link no longer works.
    const token = newOpaqueToken();
    const expiresAt = new Date(Date.now() + invitationTtlMs());
    const updated = await prisma.portalInvitation.update({
      where: { id },
      data: { tokenHash: hashInvitationToken(token), expiresAt, lastSentAt: new Date() },
      include: {
        supplier: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });
    const orgName = inv.supplier?.name ?? inv.client?.name ?? '';
    await sendInvitationEmail({
      to: inv.email,
      name: inv.name,
      token,
      orgName,
      scope: inv.role === 'SUPPLIER_PORTAL' ? 'supplier' : 'client',
      expiresAt,
    });
    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'PortalInvitation',
      entityId: id,
      action: 'RESEND',
    });
    res.json(stripTokenHash(updated));
  },
);

export { router as portalInvitationsRouter };
