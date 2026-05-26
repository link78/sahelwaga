import { z } from 'zod';

export const clientTypeSchema = z.enum([
  'CLINIC',
  'PHARMACY',
  'NGO',
  'DISTRIBUTOR',
  'GOVERNMENT',
]);

export const clientStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ON_HOLD']);

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  type: clientTypeSchema,
  country: z.string().min(2).max(100),
  city: z.string().max(100).nullish(),
  address: z.string().max(500).nullish(),
  creditTermsDays: z.number().int().min(0).nullish(),
  status: clientStatusSchema.optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
