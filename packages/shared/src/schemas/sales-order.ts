import { z } from 'zod';

export const salesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'PICKED',
  'DELIVERED',
  'PAID',
  'CANCELLED',
]);

export const createSalesOrderLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const createSalesOrderSchema = z.object({
  clientId: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'XOF', 'INR']),
  deliveryDate: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
  lines: z.array(createSalesOrderLineSchema).min(1),
});

export const updateSalesOrderSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'XOF', 'INR']).optional(),
  deliveryDate: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
  status: salesOrderStatusSchema.optional(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
