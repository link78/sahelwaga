import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createProductSchema, paginationSchema, updateProductSchema } from '@sahelwaga/shared';
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
  requireCapability('products', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { supplierLinks: { include: { supplier: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('products', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplierLinks: { include: { supplier: true } },
        pricing: { orderBy: { effectiveFrom: 'desc' }, take: 5 },
      },
    });
    if (!product) throw notFound('Product not found');
    res.json(product);
  },
);

// Create
router.post(
  '/',
  requireCapability('products', 'write'),
  validate(createProductSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createProductSchema>;
    const created = await prisma.product.create({ data });
    res.status(201).json(created);
  },
);

// Update
router.patch(
  '/:id',
  requireCapability('products', 'write'),
  validate(idParam, 'params'),
  validate(updateProductSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Product not found');
    const updated = await prisma.product.update({
      where: { id },
      data: req.body as z.infer<typeof updateProductSchema>,
    });
    res.json(updated);
  },
);

// Soft-delete
router.delete(
  '/:id',
  requireCapability('products', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Product not found');
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  },
);

export { router as productsRouter };
