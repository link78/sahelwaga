import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { authLimiter, globalLimiter } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { csrfProtection } from './middleware/cookies.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { suppliersRouter } from './modules/suppliers/suppliers.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { purchaseOrdersRouter } from './modules/purchase-orders/purchase-orders.routes.js';
import { importBatchesRouter } from './modules/import-batches/import-batches.routes.js';
import { salesOrdersRouter } from './modules/sales-orders/sales-orders.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { stockRouter } from './modules/stock/stock.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { auditLogsRouter } from './modules/audit-logs/audit-logs.routes.js';
import { complianceRouter } from './modules/compliance/compliance.routes.js';
import { portalRouter } from './modules/portal/portal.routes.js';
import { portalInvitationsRouter } from './modules/portal-invitations/portal-invitations.routes.js';

export function createApp(): express.Express {
  const app = express();

  // Honour `X-Forwarded-*` headers when running behind a reverse proxy
  // (nginx, Caddy, Cloudflare, load balancer). Without this Express keeps
  // `req.ip` as the proxy address and express-rate-limit refuses to start
  // with ERR_ERL_UNEXPECTED_X_FORWARDED_FOR. Configured via the
  // TRUST_PROXY env var; defaults to false to avoid IP spoofing when no
  // proxy is present.
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      // In non-production, accept any origin so the API works when the web
      // app is reached via an external host/IP (e.g. http://66.94.119.88:3000)
      // without requiring CORS_ORIGINS to be manually edited. In production we
      // strictly enforce the configured allowlist.
      origin: config.isProd ? config.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: (req as express.Request).requestId,
        userId: (req as express.Request).auth?.sub,
        role: (req as express.Request).auth?.role,
      }),
    }),
  );
  app.use(metricsMiddleware);
  app.use(globalLimiter);
  // CSRF protection for cookie-authenticated mutating requests. The middleware
  // internally exempts `/auth/login` (no prior session/CSRF cookie can exist)
  // and Bearer-authenticated requests (not vulnerable to CSRF). All other
  // mutating requests that present an auth cookie must carry a matching
  // X-CSRF-Token header.
  app.use(csrfProtection);

  app.use('/health', healthRouter);
  app.use('/auth', authLimiter, authRouter);
  app.use('/suppliers', suppliersRouter);
  app.use('/products', productsRouter);
  app.use('/clients', clientsRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/purchase-orders', purchaseOrdersRouter);
  app.use('/import-batches', importBatchesRouter);
  app.use('/sales-orders', salesOrdersRouter);
  app.use('/documents', documentsRouter);
  app.use('/stock', stockRouter);
  app.use('/public', publicRouter);
  app.use('/leads', leadsRouter);
  app.use('/audit-logs', auditLogsRouter);
  app.use('/compliance', complianceRouter);
  app.use('/portal', portalRouter);
  app.use('/portal-invitations', portalInvitationsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
  app.use(errorHandler);

  return app;
}
