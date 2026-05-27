import { z } from 'zod';

export const importBatchStatusSchema = z.enum([
  'PENDING',
  'IN_TRANSIT',
  'CUSTOMS',
  'CLEARED',
  'RECEIVED',
]);

export const createImportBatchLineSchema = z.object({
  productId: z.string().min(1),
  qtyShipped: z.number().int().min(1),
  lotNumber: z.string().max(100).nullish(),
  manufactureDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
});

export const createImportBatchSchema = z.object({
  purchaseOrderId: z.string().min(1),
  dgpmlAuthNumber: z.string().max(100).nullish(),
  notes: z.string().max(5000).nullish(),
  lines: z.array(createImportBatchLineSchema).min(1),
});

export const updateImportBatchSchema = z.object({
  dgpmlAuthNumber: z.string().max(100).nullish(),
  status: importBatchStatusSchema.optional(),
  shippedAt: z.string().nullish(),
  arrivedAt: z.string().nullish(),
  customsClearedAt: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
});

export type CreateImportBatchInput = z.infer<typeof createImportBatchSchema>;
export type UpdateImportBatchInput = z.infer<typeof updateImportBatchSchema>;
