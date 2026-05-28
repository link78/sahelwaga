import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AuditAction, recordAudit } from '../lib/audit.js';
import { expiryScanFailuresTotal, expiryScanRunsTotal } from '../lib/metrics.js';

// Documents whose expiry matters for compliance reporting.
const TRACKED_DOC_TYPES = ['COA', 'STABILITY', 'IMPORT_PERMIT', 'WHO_GMP', 'LICENSE'] as const;

const ALERT_WINDOW_DAYS = 30;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 5_000;

export interface ExpiryScanResult {
  scannedAt: string;
  windowDays: number;
  alertsCreated: number;
  expiredCount: number;
  expiringCount: number;
  attempts: number;
}

export interface ExpiryScanStatus {
  lastSuccessAt: string | null;
  lastError: { at: string; message: string } | null;
  lastResult: ExpiryScanResult | null;
  scheduler: { running: boolean; nextRunEarliestAt: string | null };
}

const status: ExpiryScanStatus = {
  lastSuccessAt: null,
  lastError: null,
  lastResult: null,
  scheduler: { running: false, nextRunEarliestAt: null },
};

export function getExpiryScanStatus(): ExpiryScanStatus {
  return {
    lastSuccessAt: status.lastSuccessAt,
    lastError: status.lastError,
    lastResult: status.lastResult,
    scheduler: { ...status.scheduler },
  };
}

async function runOnce(windowDays: number): Promise<Omit<ExpiryScanResult, 'attempts'>> {
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

  return {
    scannedAt: now.toISOString(),
    windowDays,
    alertsCreated,
    expiredCount,
    expiringCount,
  };
}

/**
 * Scan compliance documents for upcoming expiry. Retries transient failures
 * with exponential backoff so a flaky DB doesn't drop alerts. Final failure
 * after `MAX_ATTEMPTS` increments `expiry_scan_failures_total` and re-throws.
 */
export async function runExpiryScan(
  opts: { windowDays?: number; trigger?: 'scheduled' | 'manual' } = {},
): Promise<ExpiryScanResult> {
  const windowDays = opts.windowDays ?? ALERT_WINDOW_DAYS;
  const trigger = opts.trigger ?? 'scheduled';

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const base = await runOnce(windowDays);
      const result: ExpiryScanResult = { ...base, attempts: attempt };
      status.lastSuccessAt = result.scannedAt;
      status.lastResult = result;
      status.lastError = null;
      logger.info({ ...result, trigger }, 'expiry-scan completed');
      expiryScanRunsTotal.inc({ trigger });
      return result;
    } catch (err) {
      lastErr = err;
      logger.warn(
        { err, attempt, trigger },
        attempt < MAX_ATTEMPTS ? 'expiry-scan failed; retrying' : 'expiry-scan failed',
      );
      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  expiryScanFailuresTotal.inc({ trigger });
  status.lastError = {
    at: new Date().toISOString(),
    message: lastErr instanceof Error ? lastErr.message : String(lastErr),
  };
  throw lastErr instanceof Error ? lastErr : new Error('expiry-scan failed');
}

// Run once at startup (after a short delay) and then on a daily cadence.
let interval: NodeJS.Timeout | null = null;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startExpiryScanScheduler(): void {
  if (interval) return;
  status.scheduler.running = true;
  status.scheduler.nextRunEarliestAt = new Date(Date.now() + 60_000).toISOString();
  // Delay the first run so app startup is not blocked.
  setTimeout(() => {
    runExpiryScan().catch((err) => logger.error({ err }, 'expiry-scan failed'));
  }, 60_000).unref();
  interval = setInterval(() => {
    status.scheduler.nextRunEarliestAt = new Date(Date.now() + DAY_MS).toISOString();
    runExpiryScan().catch((err) => logger.error({ err }, 'expiry-scan failed'));
  }, DAY_MS);
  interval.unref();
}

export function stopExpiryScanScheduler(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  status.scheduler.running = false;
  status.scheduler.nextRunEarliestAt = null;
}
