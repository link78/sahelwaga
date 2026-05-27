import { z } from 'zod';

export const purchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'SHIPPED',
  'RECEIVED',
  'CANCELLED',
]);

export const currencySchema = z.enum(['USD', 'EUR', 'XOF', 'INR']);
export const incotermSchema = z.enum(['EXW', 'FOB', 'CIF', 'CFR', 'DAP', 'DDP']);

export const createPurchaseOrderLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  currency: currencySchema,
  incoterm: incotermSchema.nullish(),
  targetShipmentDate: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
  lines: z.array(createPurchaseOrderLineSchema).min(1),
});

export const updatePurchaseOrderSchema = z.object({
  currency: currencySchema.optional(),
  incoterm: incotermSchema.nullish(),
  targetShipmentDate: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
  status: purchaseOrderStatusSchema.optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
