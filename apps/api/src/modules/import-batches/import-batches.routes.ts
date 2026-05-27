import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createImportBatchSchema, updateImportBatchSchema, paginationSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// Generate batch number
async function nextBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.importBatch.count({
    where: { batchNumber: { startsWith: `IB-${year}-` } },
  });
  return `IB-${year}-${String(count + 1).padStart(4, '0')}`;
}

// List
router.get(
  '/',
  requireCapability('importBatches', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.ImportBatchWhereInput = {
      ...(q ? { batchNumber: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.importBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          purchaseOrder: { select: { id: true, poNumber: true, supplier: { select: { name: true } } } },
          _count: { select: { lines: true } },
        },
      }),
      prisma.importBatch.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('importBatches', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, poNumber: true, supplier: { select: { id: true, name: true } } } },
        lines: { include: { product: { select: { id: true, name: true, form: true, strength: true } } } },
      },
    });
    if (!batch) throw notFound('Import batch not found');
    res.json(batch);
  },
);

// Create
router.post(
  '/',
  requireCapability('importBatches', 'write'),
  validate(createImportBatchSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createImportBatchSchema>;
    const po = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
    if (!po) throw badRequest('Purchase order not found');

    const batchNumber = await nextBatchNumber();
    const lines = data.lines.map((l) => ({
      productId: l.productId,
      qtyShipped: l.qtyShipped,
      lotNumber: l.lotNumber ?? undefined,
      manufactureDate: l.manufactureDate ? new Date(l.manufactureDate) : undefined,
      expiryDate: l.expiryDate ? new Date(l.expiryDate) : undefined,
    }));

    const batch = await prisma.importBatch.create({
      data: {
        batchNumber,
        purchaseOrderId: data.purchaseOrderId,
        dgpmlAuthNumber: data.dgpmlAuthNumber ?? undefined,
        notes: data.notes ?? undefined,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    res.status(201).json(batch);
  },
);

// Update
router.patch(
  '/:id',
  requireCapability('importBatches', 'write'),
  validate(idParam, 'params'),
  validate(updateImportBatchSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.importBatch.findUnique({ where: { id } });
    if (!existing) throw notFound('Import batch not found');

    const data = req.body as z.infer<typeof updateImportBatchSchema>;
    const updateData: Prisma.ImportBatchUpdateInput = {};
    if (data.dgpmlAuthNumber !== undefined) updateData.dgpmlAuthNumber = data.dgpmlAuthNumber ?? null;
    if (data.status) updateData.status = data.status;
    if (data.shippedAt !== undefined) updateData.shippedAt = data.shippedAt ? new Date(data.shippedAt) : null;
    if (data.arrivedAt !== undefined) updateData.arrivedAt = data.arrivedAt ? new Date(data.arrivedAt) : null;
    if (data.customsClearedAt !== undefined) updateData.customsClearedAt = data.customsClearedAt ? new Date(data.customsClearedAt) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;

    const updated = await prisma.importBatch.update({ where: { id }, data: updateData });
    res.json(updated);
  },
);

export { router as importBatchesRouter };
