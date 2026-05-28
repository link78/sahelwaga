import type { NextFunction, Request, Response } from 'express';
import { httpErrorsTotal, httpRequestsTotal } from '../lib/metrics.js';

/** Best-effort route label — falls back to the raw path if no route matched. */
function routeOf(req: Request): string {
  // Express sets req.route only after the matching layer ran.
  const r = (req as Request & { route?: { path?: string } }).route?.path;
  if (r) return `${req.baseUrl ?? ''}${r}` || '/';
  return req.baseUrl || req.path || 'unknown';
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const status = res.statusCode;
    const statusClass = `${Math.floor(status / 100)}xx`;
    httpRequestsTotal.inc({
      method: req.method,
      route: routeOf(req),
      status_class: statusClass,
    });
    if (status >= 500) {
      httpErrorsTotal.inc({ method: req.method, route: routeOf(req) });
    }
  });
  next();
}
