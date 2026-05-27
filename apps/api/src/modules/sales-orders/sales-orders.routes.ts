import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createSalesOrderSchema, updateSalesOrderSchema, paginationSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// Generate SO number
async function nextSoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.salesOrder.count({
    where: { soNumber: { startsWith: `SO-${year}-` } },
  });
  return `SO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// List
router.get(
  '/',
  requireCapability('salesOrders', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.SalesOrderWhereInput = {
      ...(q ? { soNumber: { contains: q, mode: 'insensitive' } } : {}),
      ...(req.auth?.role === 'CLIENT_PORTAL' && req.auth.clientId
        ? { clientId: req.auth.clientId }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: { select: { id: true, name: true } }, _count: { select: { lines: true } } },
      }),
      prisma.salesOrder.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('salesOrders', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true, form: true, strength: true } } } },
      },
    });
    if (!so) throw notFound('Sales order not found');
    if (req.auth?.role === 'CLIENT_PORTAL' && req.auth.clientId !== so.clientId) throw notFound();
    res.json(so);
  },
);

// Create
router.post(
  '/',
  requireCapability('salesOrders', 'write'),
  validate(createSalesOrderSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createSalesOrderSchema>;
    const client = await prisma.client.findFirst({ where: { id: data.clientId, deletedAt: null } });
    if (!client) throw badRequest('Client not found');

    const soNumber = await nextSoNumber();
    const lines = data.lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.qty * l.unitPrice,
    }));
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    const so = await prisma.salesOrder.create({
      data: {
        soNumber,
        clientId: data.clientId,
        currency: data.currency,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        notes: data.notes ?? undefined,
        subtotal,
        total: subtotal,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    res.status(201).json(so);
  },
);

// Update
router.patch(
  '/:id',
  requireCapability('salesOrders', 'write'),
  validate(idParam, 'params'),
  validate(updateSalesOrderSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) throw notFound('Sales order not found');

    const data = req.body as z.infer<typeof updateSalesOrderSchema>;
    const updateData: Prisma.SalesOrderUpdateInput = {};
    if (data.currency) updateData.currency = data.currency;
    if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.status) updateData.status = data.status;

    const updated = await prisma.salesOrder.update({ where: { id }, data: updateData });
    res.json(updated);
  },
);

export { router as salesOrdersRouter };
