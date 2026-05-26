import { PrismaClient } from '@sahelwaga/db';
import { config } from '../config/env.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: config.isProd ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!config.isProd) {
  globalThis.__prisma = prisma;
}
