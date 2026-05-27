import { z } from 'zod';

export const leadKindSchema = z.enum(['PARTNERSHIP', 'ACCOUNT', 'CONTACT']);
export const leadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED']);

export const createLeadSchema = z.object({
  kind: leadKindSchema,
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  company: z.string().max(200).nullish(),
  country: z.string().max(100).nullish(),
  message: z.string().max(5000).nullish(),
  // Free-form additional metadata (subject, intent, locale, etc.)
  payload: z.record(z.string(), z.unknown()).nullish(),
});

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  message: z.string().max(5000).nullish(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
