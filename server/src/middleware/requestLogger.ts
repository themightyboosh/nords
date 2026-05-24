import { Request, Response, NextFunction } from 'express';
import logger, { generateRequestId } from '../lib/logger.js';

/**
 * HTTP request logging middleware with correlation ID support.
 *
 * Assigns a unique `requestId` to every request and:
 *   - Attaches it to `req.requestId` for downstream route handlers
 *   - Sets the `X-Request-Id` response header for client-side tracing
 *   - Includes it in every log entry for cross-log correlation
 *
 * Logs every request with method, path, status code, and response time.
 * - 2xx/3xx → info
 * - 4xx     → warn
 * - 5xx     → error
 *
 * Skips noisy paths (health checks, static assets) to keep logs clean.
 */
const SKIP_PATHS = new Set(['/health', '/favicon.ico']);

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // ── Assign correlation ID ──
  // Prefer forwarded ID (from load balancer / API gateway), else generate one
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

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
      requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      duration: `${duration}ms`,
      uid: req.user?.uid,
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
