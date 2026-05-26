import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createClientSchema, paginationSchema, updateClientSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// List
router.get(
  '/',
  requireCapability('clients', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      // Client-portal users can only see their own record
      ...(req.auth?.role === 'CLIENT_PORTAL' && req.auth.clientId
        ? { id: req.auth.clientId }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contacts: { where: { isPrimary: true }, take: 1 } },
      }),
      prisma.client.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('clients', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    if (req.auth?.role === 'CLIENT_PORTAL' && req.auth.clientId !== id) throw notFound();
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: true,
        salesOrders: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!client) throw notFound('Client not found');
    res.json(client);
  },
);

// Create
router.post(
  '/',
  requireCapability('clients', 'write'),
  validate(createClientSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createClientSchema>;
    const created = await prisma.client.create({ data });
    res.status(201).json(created);
  },
);

// Update
router.patch(
  '/:id',
  requireCapability('clients', 'write'),
  validate(idParam, 'params'),
  validate(updateClientSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Client not found');
    const updated = await prisma.client.update({
      where: { id },
      data: req.body as z.infer<typeof updateClientSchema>,
    });
    res.json(updated);
  },
);

// Soft-delete
router.delete(
  '/:id',
  requireCapability('clients', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Client not found');
    await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  },
);

export { router as clientsRouter };
