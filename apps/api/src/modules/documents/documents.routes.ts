import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@sahelwaga/db';
import {
  createDocumentSchema,
  updateDocumentSchema,
  linkDocumentSchema,
  paginationSchema,
} from '@sahelwaga/shared';
import { prisma } from '../../lib/prisma.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router: Router = Router();
router.use(authRequired);

const idParam = z.object({ id: z.string().min(1) });

// List documents with optional type filter
const listQuery = paginationSchema.extend({
  type: z.string().optional(),
});

router.get(
  '/',
  requireCapability('documents', 'read'),
  validate(listQuery, 'query'),
  async (req, res) => {
    const { page, pageSize, q, type } = req.query as unknown as z.infer<typeof listQuery>;
    const where: Prisma.DocumentWhereInput = {
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      ...(type ? { type: type as Prisma.EnumDocumentTypeFilter['equals'] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { links: true, uploadedBy: { select: { id: true, name: true } } },
      }),
      prisma.document.count({ where }),
    ]);
    res.json({ items, page, pageSize, total });
  },
);

// Get single document
router.get(
  '/:id',
  requireCapability('documents', 'read'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        links: {
          include: {
            supplier: { select: { id: true, name: true } },
            product: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
            purchaseOrder: { select: { id: true, poNumber: true } },
            importBatch: { select: { id: true, batchNumber: true } },
            salesOrder: { select: { id: true, soNumber: true } },
          },
        },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    if (!doc) throw notFound('Document not found');
    res.json(doc);
  },
);

// Create document
router.post(
  '/',
  requireCapability('documents', 'write'),
  validate(createDocumentSchema),
  async (req, res) => {
    const data = req.body as z.infer<typeof createDocumentSchema>;
    const created = await prisma.document.create({
      data: {
        ...data,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        uploadedById: req.auth!.sub,
      },
    });
    res.status(201).json(created);
  },
);

// Update document
router.patch(
  '/:id',
  requireCapability('documents', 'write'),
  validate(idParam, 'params'),
  validate(updateDocumentSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) throw notFound('Document not found');
    const data = req.body as z.infer<typeof updateDocumentSchema>;
    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...data,
        ...(data.issueDate !== undefined ? { issueDate: data.issueDate ? new Date(data.issueDate) : null } : {}),
        ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null } : {}),
      },
    });
    res.json(updated);
  },
);

// Delete document
router.delete(
  '/:id',
  requireCapability('documents', 'write'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) throw notFound('Document not found');
    await prisma.document.delete({ where: { id } });
    res.status(204).send();
  },
);

// Link a document to an entity
router.post(
  '/:id/links',
  requireCapability('documents', 'write'),
  validate(idParam, 'params'),
  validate(linkDocumentSchema),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParam>;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) throw notFound('Document not found');

    const data = req.body as z.infer<typeof linkDocumentSchema>;
    const fkCount = [data.supplierId, data.productId, data.purchaseOrderId, data.importBatchId, data.clientId, data.salesOrderId]
      .filter(Boolean).length;
    if (fkCount !== 1) {
      throw badRequest('Exactly one entity reference must be provided');
    }

    const link = await prisma.documentLink.create({
      data: { documentId: id, ...data },
    });
    res.status(201).json(link);
  },
);

// Remove a link
router.delete(
  '/:id/links/:linkId',
  requireCapability('documents', 'write'),
  validate(z.object({ id: z.string().min(1), linkId: z.string().min(1) }), 'params'),
  async (req, res) => {
    const { linkId } = req.params;
    const link = await prisma.documentLink.findUnique({ where: { id: linkId } });
    if (!link) throw notFound('Link not found');
    await prisma.documentLink.delete({ where: { id: linkId } });
    res.status(204).send();
  },
);

export { router as documentsRouter };
