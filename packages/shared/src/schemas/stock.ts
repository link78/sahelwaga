import { z } from 'zod';

export const STOCK_MOVEMENT_REASONS = [
  'IMPORT_RECEIPT',
  'SALES_DELIVERY',
  'ADJUSTMENT',
  'RETURN',
] as const;

export const createStockLocationSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
});

export const updateStockLocationSchema = createStockLocationSchema.partial();

export const createStockMovementSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  qty: z.number().int(),
  reason: z.enum(STOCK_MOVEMENT_REASONS),
  refType: z.string().max(100).nullish(),
  refId: z.string().max(100).nullish(),
  lotNumber: z.string().max(200).nullish(),
  expiryDate: z.string().datetime().nullish(),
  occurredAt: z.string().datetime().nullish(),
});
