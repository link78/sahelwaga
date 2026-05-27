import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createSalesOrderSchema, updateSalesOrderSchema, paginationSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { assertSoTransition } from '../../lib/state-machines.js';

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
    if (data.status) {
      assertSoTransition(existing.status, data.status);
      updateData.status = data.status;
    }

    const updated = await prisma.salesOrder.update({ where: { id }, data: updateData });
    res.json(updated);
  },
);

// Helpers ────────────────────────────────────────────────────────────────────

const locationBody = z.object({ locationId: z.string().min(1).optional() });

async function resolveStockLocationId(provided?: string): Promise<string> {
  if (provided) {
    const loc = await prisma.stockLocation.findFirst({ where: { id: provided, isActive: true } });
    if (!loc) throw badRequest('Stock location not found or inactive');
    return loc.id;
  }
  const fallback = await prisma.stockLocation.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!fallback) throw badRequest('No active stock location configured');
  return fallback.id;
}

async function onHand(productId: string, locationId: string): Promise<number> {
  const agg = await prisma.stockMovement.aggregate({
    where: { productId, locationId },
    _sum: { qty: true },
  });
  return agg._sum.qty ?? 0;
}

// Lifecycle: confirm a DRAFT sales order. Verifies on-hand availability at
// the target location across all lines, then transitions DRAFT → CONFIRMED.
// (Stock is not deducted here — that happens on `deliver`. Treat CONFIRMED as
// a soft reservation.)
router.post(
  '/:id/confirm',
  requireCapability('salesOrders', 'write'),
  validate(idParam, 'params'),
  validate(locationBody),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const { locationId: provided } = req.body as z.infer<typeof locationBody>;
    const so = await prisma.salesOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!so) throw notFound('Sales order not found');
    assertSoTransition(so.status, 'CONFIRMED');

    const locationId = await resolveStockLocationId(provided);

    // Aggregate requested qty per product (lines may repeat a product) and check.
    const requested = new Map<string, number>();
    for (const l of so.lines) {
      requested.set(l.productId, (requested.get(l.productId) ?? 0) + l.qty);
    }
    const shortages: { productId: string; requested: number; onHand: number }[] = [];
    for (const [productId, qty] of requested) {
      const have = await onHand(productId, locationId);
      if (have < qty) shortages.push({ productId, requested: qty, onHand: have });
    }
    if (shortages.length) {
      throw badRequest('Insufficient stock to confirm sales order', { shortages, locationId });
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
    res.json(updated);
  },
);

// Lifecycle: deliver a sales order. Creates SALES_DELIVERY (negative qty)
// stock movements for every line and transitions the SO to DELIVERED. Source
// status must be CONFIRMED or PICKED.
router.post(
  '/:id/deliver',
  requireCapability('salesOrders', 'write'),
  validate(idParam, 'params'),
  validate(locationBody),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const { locationId: provided } = req.body as z.infer<typeof locationBody>;
    const so = await prisma.salesOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!so) throw notFound('Sales order not found');
    assertSoTransition(so.status, 'DELIVERED');

    const locationId = await resolveStockLocationId(provided);

    const updated = await prisma.$transaction(async (tx) => {
      for (const line of so.lines) {
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            locationId,
            qty: -line.qty,
            reason: 'SALES_DELIVERY',
            refType: 'SalesOrder',
            refId: so.id,
          },
        });
      }
      return tx.salesOrder.update({ where: { id }, data: { status: 'DELIVERED' } });
    });

    res.json(updated);
  },
);

export { router as salesOrdersRouter };
