import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', issues: err.flatten(), requestId: _req.requestId });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details, requestId: _req.requestId });
    return;
  }
  logger.error({ err, requestId: _req.requestId }, 'Unhandled error');
  res.status(500).json({ error: 'InternalServerError', requestId: _req.requestId });
}
