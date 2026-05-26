import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createSupplierSchema, paginationSchema, updateSupplierSchema } from '@sahelwaga/shared';
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
  requireCapability('suppliers', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      // Supplier-portal users can only see their own record
      ...(req.auth?.role === 'SUPPLIER_PORTAL' && req.auth.supplierId
        ? { id: req.auth.supplierId }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('suppliers', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    if (req.auth?.role === 'SUPPLIER_PORTAL' && req.auth.supplierId !== id) throw notFound();
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: true,
        vetting: true,
        exportRecords: true,
        priceTiers: true,
        productLinks: { include: { product: true } },
      },
    });
    if (!supplier) throw notFound('Supplier not found');
    res.json(supplier);
  },
);

// Create
router.post(
  '/',
  requireCapability('suppliers', 'write'),
  validate(createSupplierSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createSupplierSchema>;
    const created = await prisma.supplier.create({ data });
    res.status(201).json(created);
  },
);

// Update
router.patch(
  '/:id',
  requireCapability('suppliers', 'write'),
  validate(idParam, 'params'),
  validate(updateSupplierSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Supplier not found');
    const updated = await prisma.supplier.update({
      where: { id },
      data: req.body as z.infer<typeof updateSupplierSchema>,
    });
    res.json(updated);
  },
);

// Soft-delete
router.delete(
  '/:id',
  requireCapability('suppliers', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw notFound('Supplier not found');
    await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  },
);

export { router as suppliersRouter };
