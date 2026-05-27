import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createLeadSchema, productCategorySchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';

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

  res.status(201).json({ id: lead.id, status: lead.status });
});

export { router as publicRouter };
