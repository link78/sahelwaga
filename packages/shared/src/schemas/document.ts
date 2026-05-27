import { z } from 'zod';

export const DOCUMENT_TYPES = [
  'WHO_GMP',
  'COA',
  'STABILITY',
  'IMPORT_PERMIT',
  'INVOICE',
  'PACKING_LIST',
  'BL_AWB',
  'LICENSE',
  'CONTRACT',
  'OTHER',
] as const;

export const createDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  title: z.string().min(1).max(300),
  s3Key: z.string().min(1).max(1000),
  mimeType: z.string().max(100).nullish(),
  sizeBytes: z.number().int().min(0).nullish(),
  issueDate: z.string().datetime().nullish(),
  expiryDate: z.string().datetime().nullish(),
  notes: z.string().max(5000).nullish(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const linkDocumentSchema = z.object({
  supplierId: z.string().min(1).nullish(),
  productId: z.string().min(1).nullish(),
  purchaseOrderId: z.string().min(1).nullish(),
  importBatchId: z.string().min(1).nullish(),
  clientId: z.string().min(1).nullish(),
  salesOrderId: z.string().min(1).nullish(),
});
