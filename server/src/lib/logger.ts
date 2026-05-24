import { createLogger, format, transports } from 'winston';
import crypto from 'crypto';

const { combine, timestamp, printf, colorize, errors } = format;

const isDev = process.env.NODE_ENV !== 'production';

// ── Sensitive field sanitization ──
// Redacts values of keys that may contain secrets, tokens, passwords, etc.
const SENSITIVE_KEYS = /token|password|secret|authorization|cookie|credential|apikey|api_key/i;

const sanitize = format((info) => {
  const redact = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // Redact metadata fields (everything except level, message, timestamp, stack)
  const { level, message, timestamp: ts, stack, ...meta } = info;
  const sanitized = redact(meta);
  return { level, message, timestamp: ts, stack, ...sanitized };
});

/**
 * Structured log format for Nords server.
 * In dev: colorized, human-readable.
 * In prod: JSON for log aggregators (Cloud Logging, Datadog, etc.)
 */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
  sanitize(),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}${metaStr}`
      : `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  sanitize(),
  format.json(),
);

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev ? devFormat : prodFormat,
  defaultMeta: { service: 'nords-server' },
  transports: [
    new transports.Console(),
    // In dev, also write errors to a local file for post-mortem
    ...(isDev
      ? [
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5_242_880, // 5MB
            maxFiles: 3,
          }),
          new transports.File({
            filename: 'logs/combined.log',
            maxsize: 5_242_880,
            maxFiles: 3,
          }),
        ]
      : []),
  ],
});

/**
 * Generate a short unique request ID for correlation.
 * Format: 8-char hex (compact, sufficient for request tracing).
 */
export function generateRequestId(): string {
  return crypto.randomBytes(4).toString('hex');
}

export default logger;
