import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AuditAction, recordAudit } from '../lib/audit.js';

// Documents whose expiry matters for compliance reporting.
const TRACKED_DOC_TYPES = ['COA', 'STABILITY', 'IMPORT_PERMIT', 'WHO_GMP', 'LICENSE'] as const;

const ALERT_WINDOW_DAYS = 30;

export interface ExpiryScanResult {
  scannedAt: string;
  windowDays: number;
  alertsCreated: number;
  expiredCount: number;
  expiringCount: number;
}

/**
 * Scan compliance documents for upcoming expiry and write `EXPIRY_ALERT`
 * audit-log entries (one per affected document) so the dashboard can surface
 * them without storing alert state on the document itself.
 *
 * To avoid duplicate alerts the scanner skips documents that already have an
 * EXPIRY_ALERT entry in the past `windowDays`.
 */
export async function runExpiryScan(opts: { windowDays?: number } = {}): Promise<ExpiryScanResult> {
  const windowDays = opts.windowDays ?? ALERT_WINDOW_DAYS;
  const now = new Date();
  const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const dedupeSince = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const documents = await prisma.document.findMany({
    where: {
      type: { in: TRACKED_DOC_TYPES as unknown as string[] as never },
      expiryDate: { not: null, lte: horizon },
    },
    select: { id: true, type: true, title: true, expiryDate: true },
  });

  let alertsCreated = 0;
  let expiredCount = 0;
  let expiringCount = 0;

  for (const doc of documents) {
    if (!doc.expiryDate) continue;
    const expired = doc.expiryDate < now;
    if (expired) expiredCount++;
    else expiringCount++;

    const recent = await prisma.auditLog.findFirst({
      where: {
        entity: 'Document',
        entityId: doc.id,
        action: AuditAction.EXPIRY_ALERT,
        createdAt: { gte: dedupeSince },
      },
      select: { id: true },
    });
    if (recent) continue;

    await recordAudit({
      entity: 'Document',
      entityId: doc.id,
      action: AuditAction.EXPIRY_ALERT,
      after: {
        type: doc.type,
        title: doc.title,
        expiryDate: doc.expiryDate.toISOString(),
        status: expired ? 'EXPIRED' : 'EXPIRING_SOON',
        windowDays,
      },
    });
    alertsCreated++;
  }

  const result: ExpiryScanResult = {
    scannedAt: now.toISOString(),
    windowDays,
    alertsCreated,
    expiredCount,
    expiringCount,
  };
  logger.info(result, 'expiry-scan completed');
  return result;
}

// Run once at startup (after a short delay) and then on a daily cadence.
let interval: NodeJS.Timeout | null = null;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startExpiryScanScheduler(): void {
  if (interval) return;
  // Delay the first run so app startup is not blocked.
  setTimeout(() => {
    runExpiryScan().catch((err) => logger.error({ err }, 'expiry-scan failed'));
  }, 60_000).unref();
  interval = setInterval(() => {
    runExpiryScan().catch((err) => logger.error({ err }, 'expiry-scan failed'));
  }, DAY_MS);
  interval.unref();
}

export function stopExpiryScanScheduler(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
