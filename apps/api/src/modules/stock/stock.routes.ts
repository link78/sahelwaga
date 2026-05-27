import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import {
  createStockLocationSchema,
  updateStockLocationSchema,
  createStockMovementSchema,
  paginationSchema,
} from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// ─── Stock Locations ─────────────────────────────────────────────────────────

router.get(
  '/locations',
  requireCapability('products', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.StockLocationWhereInput = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.stockLocation.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockLocation.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

router.get(
  '/locations/:id',
  requireCapability('products', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const location = await prisma.stockLocation.findUnique({ where: { id } });
    if (!location) throw notFound('Stock location not found');
    res.json(location);
  },
);

router.post(
  '/locations',
  requireCapability('products', 'write'),
  validate(createStockLocationSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createStockLocationSchema>;
    const created = await prisma.stockLocation.create({ data });
    res.status(201).json(created);
  },
);

router.patch(
  '/locations/:id',
  requireCapability('products', 'write'),
  validate(idParam, 'params'),
  validate(updateStockLocationSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.stockLocation.findUnique({ where: { id } });
    if (!existing) throw notFound('Stock location not found');
    const updated = await prisma.stockLocation.update({
      where: { id },
      data: req.body as z.infer<typeof updateStockLocationSchema>,
    });
    res.json(updated);
  },
);

router.delete(
  '/locations/:id',
  requireCapability('products', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.stockLocation.findUnique({ where: { id } });
    if (!existing) throw notFound('Stock location not found');
    await prisma.stockLocation.update({ where: { id }, data: { isActive: false } });
    res.status(204).send();
  },
);

// ─── Stock Movements ─────────────────────────────────────────────────────────

const movementsQuery = paginationSchema.extend({
  productId: z.string().optional(),
  locationId: z.string().optional(),
});

router.get(
  '/movements',
  requireCapability('products', 'read'),
  validate(movementsQuery, 'query'),
  async (req, res) => {
    const { page, pageSize, productId, locationId } = req.query as unknown as z.infer<typeof movementsQuery>;
    const where: Prisma.StockMovementWhereInput = {
      ...(productId ? { productId } : {}),
      ...(locationId ? { locationId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

router.post(
  '/movements',
  requireCapability('products', 'write'),
  validate(createStockMovementSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createStockMovementSchema>;
    const created = await prisma.stockMovement.create({
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      },
    });
    res.status(201).json(created);
  },
);

// ─── Stock Levels (aggregated view) ──────────────────────────────────────────

router.get(
  '/levels',
  requireCapability('products', 'read'),
  async (_req, res) => {
    const levels = await prisma.stockMovement.groupBy({
      by: ['productId', 'locationId'],
      _sum: { qty: true },
    });

    // Enrich with product and location names
    const productIds = [...new Set(levels.map((l) => l.productId))];
    const locationIds = [...new Set(levels.map((l) => l.locationId))];

    const [products, locations] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      }),
      prisma.stockLocation.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true },
      }),
    ]);

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
    const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

    const items = levels.map((l) => ({
      productId: l.productId,
      productName: productMap[l.productId] ?? 'Unknown',
      locationId: l.locationId,
      locationName: locationMap[l.locationId] ?? 'Unknown',
      onHand: l._sum.qty ?? 0,
    }));

    res.json({ items });
  },
);

export { router as stockRouter };
