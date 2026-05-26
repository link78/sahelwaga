import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { authLimiter, globalLimiter } from './middleware/rate-limit.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { suppliersRouter } from './modules/suppliers/suppliers.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(globalLimiter);

  app.use('/health', healthRouter);
  app.use('/auth', authLimiter, authRouter);
  app.use('/suppliers', suppliersRouter);
  app.use('/products', productsRouter);

  // ---------------------------------------------------------------------
  // Phase 1+ modules — mount here as they are built.
  // app.use('/clients', clientsRouter);
  // app.use('/documents', documentsRouter);
  // app.use('/purchase-orders', purchaseOrdersRouter);
  // app.use('/import-batches', importBatchesRouter);
  // app.use('/sales-orders', salesOrdersRouter);
  // app.use('/stock', stockRouter);
  // app.use('/dashboard', dashboardRouter);
  // app.use('/public', publicRouter); // unauthenticated catalog + leads
  // ---------------------------------------------------------------------

  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
  app.use(errorHandler);

  return app;
}
