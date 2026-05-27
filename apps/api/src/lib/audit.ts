import { prisma } from './prisma.js';
import { logger } from './logger.js';

/** Diffable JSON value supplied to the audit log helpers. */
export type AuditJson = Record<string, unknown> | null | undefined;

interface RecordAuditOptions {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  before?: AuditJson;
  after?: AuditJson;
}

/**
 * Persist a single audit-log entry.
 *
 * Audit writes must never fail the calling request — if the insert errors
 * (e.g. database unavailable) we log and swallow.
 */
export async function recordAudit(opts: RecordAuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId ?? null,
        entity: opts.entity,
        entityId: opts.entityId,
        action: opts.action,
        beforeJson: (opts.before ?? null) as never,
        afterJson: (opts.after ?? null) as never,
      },
    });
  } catch (err) {
    logger.warn({ err, audit: opts }, 'failed to write audit log entry');
  }
}

/** Standard write actions surfaced in the audit UI. */
export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  TRANSITION: 'TRANSITION',
  RECEIVE: 'RECEIVE',
  CONFIRM: 'CONFIRM',
  DELIVER: 'DELIVER',
  EXPIRY_ALERT: 'EXPIRY_ALERT',
  LEAD_SUBMITTED: 'LEAD_SUBMITTED',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
