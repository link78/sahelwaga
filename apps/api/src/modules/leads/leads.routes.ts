import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { paginationSchema, updateLeadSchema, leadKindSchema, leadStatusSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

const listQuerySchema = paginationSchema.extend({
  kind: leadKindSchema.optional(),
  status: leadStatusSchema.optional(),
});

router.get(
  '/',
  requireCapability('leads', 'read'),
  validate(listQuerySchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q, kind, status } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where: Prisma.LeadWhereInput = {
      ...(kind ? { kind } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { company: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

router.get(
  '/:id',
  requireCapability('leads', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw notFound('Lead not found');
    res.json(lead);
  },
);

router.patch(
  '/:id',
  requireCapability('leads', 'write'),
  validate(idParam, 'params'),
  validate(updateLeadSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) throw notFound('Lead not found');
    const data = req.body as z.infer<typeof updateLeadSchema>;
    const updated = await prisma.lead.update({ where: { id }, data });
    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'Lead',
      entityId: id,
      action: AuditAction.UPDATE,
      before: { status: existing.status, message: existing.message },
      after: { status: updated.status, message: updated.message },
    });
    res.json(updated);
  },
);

export { router as leadsRouter };
