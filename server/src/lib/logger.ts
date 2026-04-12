import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Structured log format for Nords server.
 * In dev: colorized, human-readable.
 * In prod: JSON for log aggregators (Cloud Logging, Datadog, etc.)
 */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
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

export default logger;
