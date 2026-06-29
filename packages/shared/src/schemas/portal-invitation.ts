import { z } from 'zod';

export const portalInvitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED',
]);
export type PortalInvitationStatus = z.infer<typeof portalInvitationStatusSchema>;

export const portalInvitationRoleSchema = z.enum(['SUPPLIER_PORTAL', 'CLIENT_PORTAL']);
export type PortalInvitationRole = z.infer<typeof portalInvitationRoleSchema>;

export const createPortalInvitationSchema = z
  .object({
    email: z.string().email().max(200),
    name: z.string().min(1).max(200),
    role: portalInvitationRoleSchema,
    supplierId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'SUPPLIER_PORTAL') {
      if (!val.supplierId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['supplierId'],
          message: 'supplierId is required for SUPPLIER_PORTAL invitations',
        });
      }
      if (val.clientId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clientId'],
          message: 'clientId must be omitted for SUPPLIER_PORTAL invitations',
        });
      }
    } else if (val.role === 'CLIENT_PORTAL') {
      if (!val.clientId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clientId'],
          message: 'clientId is required for CLIENT_PORTAL invitations',
        });
      }
      if (val.supplierId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['supplierId'],
          message: 'supplierId must be omitted for CLIENT_PORTAL invitations',
        });
      }
    }
  });
export type CreatePortalInvitationInput = z.infer<typeof createPortalInvitationSchema>;

export const acceptPortalInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});
export type AcceptPortalInvitationInput = z.infer<typeof acceptPortalInvitationSchema>;
