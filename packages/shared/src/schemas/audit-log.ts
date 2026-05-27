import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.string().max(50).optional(),
  entityId: z.string().max(50).optional(),
  action: z.string().max(50).optional(),
  actorId: z.string().max(50).optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
