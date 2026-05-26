import { z } from 'zod';

export const productCategorySchema = z.enum([
  'ANTIBIOTIC',
  'ANTIMALARIAL',
  'PAINKILLER',
  'PEDIATRIC_SYRUP',
  'IV_FLUID',
  'CONSUMABLE',
  'OTHER',
]);

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  inn: z.string().max(200).nullish(),
  category: productCategorySchema,
  form: z.string().max(100).nullish(),
  strength: z.string().max(100).nullish(),
  packSize: z.string().max(100).nullish(),
  shelfLifeMonths: z.number().int().min(1).nullish(),
  storageConditions: z.string().max(500).nullish(),
  status: productStatusSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
