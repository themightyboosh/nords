/**
 * validate.ts — Express middleware that validates request bodies with Zod.
 *
 * Returns structured 400 errors that an MCP agent (or any consumer)
 * can parse to understand exactly which field failed and why.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Returns Express middleware that validates req.body against the given Zod schema.
 * On success, replaces req.body with the parsed + coerced + defaulted data.
 * On failure, returns a structured 400 with per-field error details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        expected: 'expected' in issue ? issue.expected : undefined,
        received: 'received' in issue ? issue.received : undefined,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details,
      });
      return;
    }

    // Replace body with coerced + defaulted data
    req.body = result.data;
    next();
  };
}
