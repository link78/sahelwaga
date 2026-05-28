import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { render as renderMetrics } from '../../lib/metrics.js';

const router: Router = Router();

// Pre-computed at module load — the package.json version is small + immutable
// and bundled at build time so this is safe to read once.
const startedAt = Date.now();
const version = process.env.npm_package_version ?? '0.1.0';

/** Backwards-compatible default probe used by existing clients/dashboards. */
router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

/**
 * Liveness probe — answers as long as the event loop is responsive.
 * Used by container orchestrators to restart wedged processes.
 */
router.get('/live', (_req, res) => {
  res.json({
    status: 'ok',
    version,
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
  });
});

/**
 * Readiness probe — confirms the API can serve traffic (DB reachable).
 * Used by load balancers/k8s to gate traffic.
 */
router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'ok', version });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      db: 'down',
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
});

/** Prometheus text-format metrics. */
router.get('/metrics', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(renderMetrics());
});

export { router as healthRouter };
