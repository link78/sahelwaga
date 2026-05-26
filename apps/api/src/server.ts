import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(config.API_PORT, config.API_HOST, () => {
  logger.info(
    { port: config.API_PORT, host: config.API_HOST, env: config.NODE_ENV },
    'API listening',
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
