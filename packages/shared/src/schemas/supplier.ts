import { z } from 'zod';

export const supplierStatusSchema = z.enum([
  'PROSPECT',
  'UNDER_REVIEW',
  'APPROVED',
  'BLOCKED',
  'REJECTED',
]);

export const whoGmpStatusSchema = z.enum(['UNKNOWN', 'PENDING', 'VERIFIED', 'EXPIRED']);
export const supplierRatingSchema = z.enum(['A', 'B', 'C']);

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().min(2).max(100),
  status: supplierStatusSchema.optional(),
  whoGmpStatus: whoGmpStatusSchema.optional(),
  rating: supplierRatingSchema.nullish(),
  notes: z.string().max(5000).nullish(),
  showSupplierPublicly: z.boolean().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
