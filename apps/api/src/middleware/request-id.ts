import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const HEADER = 'x-request-id';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Assigns each request a stable id (honouring an inbound `x-request-id`
 * header when present) and echoes it back on the response so clients can
 * correlate failures with server-side logs.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
}
