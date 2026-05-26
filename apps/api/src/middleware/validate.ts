import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with parsed (coerced) value
      (req as unknown as Record<Source, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
        return;
      }
      throw err;
    }
  };
}
