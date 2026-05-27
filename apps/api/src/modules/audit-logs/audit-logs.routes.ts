import { Router } from 'express';
import { Prisma } from '@sahelwaga/db';
import { auditLogQuerySchema } from '@sahelwaga/shared';
import type { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

router.get(
  '/',
  requireCapability('auditLogs', 'read'),
  validate(auditLogQuerySchema, 'query'),
  async (req, res) => {
    const { page, pageSize, entity, entityId, action, actorId, since, until } =
      req.query as unknown as z.infer<typeof auditLogQuerySchema>;

    const where: Prisma.AuditLogWhereInput = {
      ...(entity ? { entity } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(actorId ? { actorId } : {}),
      ...(since || until
        ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ items, page, pageSize, total });
  },
);

export { router as auditLogsRouter };
