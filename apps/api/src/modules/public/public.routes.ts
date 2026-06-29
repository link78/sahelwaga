import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createLeadSchema, productCategorySchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';
import { sendMail } from '../../lib/mailer.js';
import { config } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const router: Router = Router();

// ---------------------------------------------------------------------------
// GET /public/products — read-only catalog feed for the marketing site.
// Returns only ACTIVE, non-deleted products. Supports basic filters used by
// the public catalog page.
// ---------------------------------------------------------------------------
const catalogQuerySchema = z.object({
  category: productCategorySchema.optional(),
  form: z.string().min(1).max(100).optional(),
  q: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

router.get('/products', validate(catalogQuerySchema, 'query'), async (req, res) => {
  const { category, form, q, limit } = req.query as unknown as z.infer<typeof catalogQuerySchema>;
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    status: 'ACTIVE',
    ...(category ? { category } : {}),
    ...(form ? { form: { equals: form, mode: 'insensitive' } } : {}),
    ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
  };

  const items = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    take: limit,
    include: {
      supplierLinks: {
        where: { supplier: { deletedAt: null, showSupplierPublicly: true } },
        include: { supplier: { select: { name: true, country: true } } },
        take: 1,
      },
    },
  });

  // Strip internal-only fields from the public payload.
  const payload = items.map((p) => ({
    id: p.id,
    name: p.name,
    inn: p.inn,
    category: p.category,
    form: p.form,
    strength: p.strength,
    packSize: p.packSize,
    storageConditions: p.storageConditions,
    manufacturer: p.supplierLinks[0]?.supplier.name ?? null,
    manufacturerCountry: p.supplierLinks[0]?.supplier.country ?? null,
  }));

  res.json({ items: payload, total: payload.length });
});

// ---------------------------------------------------------------------------
// POST /public/leads — rate-limited public lead capture.
// ---------------------------------------------------------------------------
const leadLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later.' },
});

router.post('/leads', leadLimiter, validate(createLeadSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createLeadSchema>;
  const lead = await prisma.lead.create({
    data: {
      kind: data.kind,
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      country: data.country ?? null,
      message: data.message ?? null,
      payload: (data.payload ?? null) as never,
    },
  });

  await recordAudit({
    entity: 'Lead',
    entityId: lead.id,
    action: AuditAction.LEAD_SUBMITTED,
    after: {
      kind: lead.kind,
      email: lead.email,
      company: lead.company,
      country: lead.country,
    },
  });

  // Fire-and-forget notification email. Failures must never break the
  // response — the lead is already safely persisted.
  void notifyLead(lead).catch((err) => {
    logger.error({ err, leadId: lead.id }, 'lead notification email failed');
  });

  res.status(201).json({ id: lead.id, status: lead.status });
});

interface LeadEmailInput {
  id: string;
  kind: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  message: string | null;
}

async function notifyLead(lead: LeadEmailInput): Promise<void> {
  const to = config.LEAD_NOTIFY_TO ?? config.SMTP_FROM;
  if (!to) return; // No recipient configured — nothing to do.
  const subject = `New ${lead.kind.toLowerCase()} lead from ${lead.name}`;
  const lines = [
    `A new lead was submitted via the public contact form.`,
    ``,
    `Kind:    ${lead.kind}`,
    `Name:    ${lead.name}`,
    `Email:   ${lead.email}`,
    `Company: ${lead.company ?? '—'}`,
    `Country: ${lead.country ?? '—'}`,
    ``,
    `Message:`,
    lead.message?.trim() ? lead.message : '(no message provided)',
    ``,
    `Lead ID: ${lead.id}`,
  ];
  await sendMail({
    to,
    subject,
    text: lines.join('\n'),
    replyTo: lead.email,
  });
}

export { router as publicRouter };
