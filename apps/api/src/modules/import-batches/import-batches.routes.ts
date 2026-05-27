import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createImportBatchSchema, updateImportBatchSchema, paginationSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { assertIbTransition, assertPoTransition } from '../../lib/state-machines.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';

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
    if (data.status) {
      assertIbTransition(existing.status, data.status);
      if (data.status === 'RECEIVED' && existing.status !== 'RECEIVED') {
        throw badRequest(
          'Use POST /import-batches/:id/receive to mark a batch as received (creates stock movements).',
        );
      }
      updateData.status = data.status;
    }

    const updated = await prisma.importBatch.update({ where: { id }, data: updateData });
    res.json(updated);
  },
);

// Lifecycle: receive an import batch. Transitions IB → RECEIVED, sets per-line
// qtyReceived (defaults to qtyShipped) and creates IMPORT_RECEIPT (positive)
// stock movements at the target location. If every batch on the parent PO
// is RECEIVED, cascades the PO to RECEIVED too.
const receiveBody = z.object({
  locationId: z.string().min(1).optional(),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        qtyReceived: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
});

router.post(
  '/:id/receive',
  requireCapability('importBatches', 'write'),
  validate(idParam, 'params'),
  validate(receiveBody),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const body = req.body as z.infer<typeof receiveBody>;

    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { lines: true, purchaseOrder: { select: { id: true, status: true } } },
    });
    if (!batch) throw notFound('Import batch not found');
    assertIbTransition(batch.status, 'RECEIVED');

    const locationId = await (async () => {
      if (body.locationId) {
        const loc = await prisma.stockLocation.findFirst({
          where: { id: body.locationId, isActive: true },
        });
        if (!loc) throw badRequest('Stock location not found or inactive');
        return loc.id;
      }
      const fallback = await prisma.stockLocation.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!fallback) throw badRequest('No active stock location configured');
      return fallback.id;
    })();

    // Map line overrides by line id
    const overrides = new Map<string, number>();
    for (const o of body.lines ?? []) overrides.set(o.lineId, o.qtyReceived ?? -1);

    // Validate every override targets an existing line on this batch
    for (const lineId of overrides.keys()) {
      if (!batch.lines.find((l) => l.id === lineId)) {
        throw badRequest(`Line ${lineId} does not belong to this import batch`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const line of batch.lines) {
        const override = overrides.get(line.id);
        const qtyReceived = override !== undefined && override >= 0 ? override : line.qtyShipped;
        await tx.importBatchLine.update({
          where: { id: line.id },
          data: { qtyReceived },
        });
        if (qtyReceived > 0) {
          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              locationId,
              qty: qtyReceived,
              reason: 'IMPORT_RECEIPT',
              refType: 'ImportBatch',
              refId: batch.id,
              lotNumber: line.lotNumber ?? undefined,
              expiryDate: line.expiryDate ?? undefined,
            },
          });
        }
      }

      const ib = await tx.importBatch.update({
        where: { id },
        data: { status: 'RECEIVED', arrivedAt: batch.arrivedAt ?? new Date() },
      });

      // Cascade: if all sibling batches on the PO are RECEIVED, mark PO RECEIVED.
      const siblings = await tx.importBatch.findMany({
        where: { purchaseOrderId: batch.purchaseOrderId },
        select: { status: true },
      });
      if (siblings.length > 0 && siblings.every((s) => s.status === 'RECEIVED')) {
        const po = batch.purchaseOrder;
        // Only cascade from a status that legally transitions to RECEIVED.
        try {
          assertPoTransition(po.status, 'RECEIVED');
          await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'RECEIVED' } });
        } catch {
          // PO already RECEIVED / CANCELLED / not in SHIPPED — leave as-is.
        }
      }

      return ib;
    });

    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'ImportBatch',
      entityId: id,
      action: AuditAction.RECEIVE,
      before: { status: 'CLEARED' },
      after: { status: updated.status, batchNumber: updated.batchNumber },
    });

    res.json(updated);
  },
);

export { router as importBatchesRouter };
