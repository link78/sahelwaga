import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema, paginationSchema } from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { assertPoTransition } from '../../lib/state-machines.js';
import { AuditAction, recordAudit } from '../../lib/audit.js';
import { streamOrderPdf } from '../../lib/pdf/order-pdf.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// Generate PO number
async function nextPoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: { poNumber: { startsWith: `PO-${year}-` } },
  });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// List
router.get(
  '/',
  requireCapability('purchaseOrders', 'read'),
  validate(paginationSchema, 'query'),
  async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(q ? { poNumber: { contains: q, mode: 'insensitive' } } : {}),
      ...(req.auth?.role === 'SUPPLIER_PORTAL' && req.auth.supplierId
        ? { supplierId: req.auth.supplierId }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { supplier: { select: { id: true, name: true } }, _count: { select: { lines: true } } },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get one
router.get(
  '/:id',
  requireCapability('purchaseOrders', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: { include: { product: { select: { id: true, name: true, form: true, strength: true } } } },
        importBatches: { select: { id: true, batchNumber: true, status: true } },
      },
    });
    if (!po) throw notFound('Purchase order not found');
    if (req.auth?.role === 'SUPPLIER_PORTAL' && req.auth.supplierId !== po.supplierId) throw notFound();
    res.json(po);
  },
);

// Create
router.post(
  '/',
  requireCapability('purchaseOrders', 'write'),
  validate(createPurchaseOrderSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createPurchaseOrderSchema>;
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, deletedAt: null } });
    if (!supplier) throw badRequest('Supplier not found');

    const poNumber = await nextPoNumber();
    const lines = data.lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: l.qty * l.unitPrice,
    }));
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        currency: data.currency,
        incoterm: data.incoterm ?? undefined,
        targetShipmentDate: data.targetShipmentDate ? new Date(data.targetShipmentDate) : undefined,
        notes: data.notes ?? undefined,
        subtotal,
        total: subtotal,
        lines: { create: lines },
      },
      include: { lines: true },
    });
    await recordAudit({
      actorId: req.auth?.sub,
      entity: 'PurchaseOrder',
      entityId: po.id,
      action: AuditAction.CREATE,
      after: { poNumber: po.poNumber, supplierId: po.supplierId, total: po.total.toString() },
    });
    res.status(201).json(po);
  },
);

// Update (status transitions + metadata)
router.patch(
  '/:id',
  requireCapability('purchaseOrders', 'write'),
  validate(idParam, 'params'),
  validate(updatePurchaseOrderSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw notFound('Purchase order not found');

    const data = req.body as z.infer<typeof updatePurchaseOrderSchema>;
    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (data.currency) updateData.currency = data.currency;
    if (data.incoterm !== undefined) updateData.incoterm = data.incoterm ?? null;
    if (data.targetShipmentDate !== undefined) {
      updateData.targetShipmentDate = data.targetShipmentDate ? new Date(data.targetShipmentDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.status) {
      assertPoTransition(existing.status, data.status);
      updateData.status = data.status;
    }

    const updated = await prisma.purchaseOrder.update({ where: { id }, data: updateData });
    if (data.status && data.status !== existing.status) {
      await recordAudit({
        actorId: req.auth?.sub,
        entity: 'PurchaseOrder',
        entityId: id,
        action: AuditAction.TRANSITION,
        before: { status: existing.status },
        after: { status: updated.status },
      });
    }
    res.json(updated);
  },
);

// PDF rendering — streams a pdfkit-generated order document.
router.get(
  '/:id/pdf',
  requireCapability('purchaseOrders', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: { include: { product: { select: { name: true, form: true, strength: true } } } },
      },
    });
    if (!po) throw notFound('Purchase order not found');
    if (req.auth?.role === 'SUPPLIER_PORTAL' && req.auth.supplierId !== po.supplierId) throw notFound();

    streamOrderPdf(res, {
      documentTitle: 'Purchase Order',
      documentNumber: po.poNumber,
      date: po.createdAt.toISOString().slice(0, 10),
      status: po.status,
      currency: po.currency,
      counterpartyLabel: 'Supplier',
      counterpartyName: po.supplier.name,
      counterpartyDetails: [po.supplier.country],
      meta: [
        ...(po.incoterm ? [{ label: 'Incoterm', value: po.incoterm }] : []),
        ...(po.targetShipmentDate
          ? [{ label: 'Target shipment', value: po.targetShipmentDate.toISOString().slice(0, 10) }]
          : []),
      ],
      lines: po.lines.map((l) => ({
        product: [l.product.name, l.product.strength, l.product.form].filter(Boolean).join(' · '),
        qty: l.qty,
        unitPrice: l.unitPrice.toString(),
        lineTotal: l.lineTotal.toString(),
      })),
      subtotal: po.subtotal.toString(),
      total: po.total.toString(),
      notes: po.notes,
    });
  },
);

export { router as purchaseOrdersRouter };
