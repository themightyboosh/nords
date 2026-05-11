import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger.js';

/**
 * HTTP request logging middleware.
 *
 * Logs every request with method, path, status code, and response time.
 * - 2xx/3xx → info
 * - 4xx     → warn
 * - 5xx     → error
 *
 * Skips noisy paths (health checks, static assets) to keep logs clean.
 */
const SKIP_PATHS = new Set(['/health', '/favicon.ico']);

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const start = Date.now();

  // Hook into response finish to capture status + timing
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const meta = {
      method: req.method,
      path: req.originalUrl,
      status,
      duration: `${duration}ms`,
      // Include content-length if present (useful for spotting large payloads)
      ...(res.getHeader('content-length') ? { bytes: res.getHeader('content-length') } : {}),
    };

    if (status >= 500) {
      logger.error(`${req.method} ${req.originalUrl} ${status}`, meta);
    } else if (status >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} ${status}`, meta);
    } else {
      logger.info(`${req.method} ${req.originalUrl} ${status}`, meta);
    }
  });

  next();
}
