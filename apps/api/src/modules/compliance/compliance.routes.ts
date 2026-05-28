import { Router } from 'express';
import { authRequired, requireCapability } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { getExpiryScanStatus, runExpiryScan } from '../../workers/expiry-scan.js';
import { AuditAction } from '../../lib/audit.js';

const router: Router = Router();
router.use(authRequired);

// Trigger an on-demand expiry scan (admin/ops). Idempotent — alerts are
// deduped inside the scanner.
router.post('/expiry-scan/run', requireCapability('compliance', 'write'), async (_req, res) => {
  const result = await runExpiryScan({ trigger: 'manual' });
  res.json(result);
});

// Health/status of the expiry-scan worker for ops dashboards.
router.get('/expiry-scan/status', requireCapability('compliance', 'read'), (_req, res) => {
  res.json(getExpiryScanStatus());
});

// Surface the most recent EXPIRY_ALERT entries with their parent documents.
router.get('/expiry-alerts', requireCapability('compliance', 'read'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
  const alerts = await prisma.auditLog.findMany({
    where: { entity: 'Document', action: AuditAction.EXPIRY_ALERT },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const docIds = Array.from(new Set(alerts.map((a) => a.entityId)));
  const documents = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, type: true, title: true, expiryDate: true },
  });
  const docMap = new Map(documents.map((d) => [d.id, d]));

  res.json({
    items: alerts.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      documentId: a.entityId,
      payload: a.afterJson,
      document: docMap.get(a.entityId) ?? null,
    })),
    total: alerts.length,
  });
});

export { router as complianceRouter };
