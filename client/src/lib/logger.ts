/**
 * Nords Client Logger
 * 
 * Browser-compatible structured logger that mirrors Winston's API.
 * Winston itself requires Node.js APIs (fs, stream, os) and cannot
 * run in the browser. This logger provides the same interface so
 * client and server code look identical.
 * 
 * In production, errors are batched and can be sent to a server 
 * endpoint for aggregation (wired in Epic 5 when HTTP layer ships).
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  meta?: Record<string, unknown>;
  stack?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const isDev = import.meta.env.DEV;
const currentLevel: LogLevel = isDev ? 'debug' : 'info';

const STYLES: Record<LogLevel, string> = {
  error: 'color: #ef4444; font-weight: bold;',
  warn: 'color: #fbbf24; font-weight: bold;',
  info: 'color: #4da6ff;',
  debug: 'color: #a78bfa;',
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: Error): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'nords-client',
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    ...(error?.stack ? { stack: error.stack } : {}),
  };
}

function emit(entry: LogEntry): void {
  const consoleFn = entry.level === 'error' ? console.error
    : entry.level === 'warn' ? console.warn
    : entry.level === 'debug' ? console.debug
    : console.info;

  if (isDev) {
    const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    consoleFn(
      `%c[${entry.level.toUpperCase()}]%c ${entry.message}${metaStr}`,
      STYLES[entry.level],
      'color: inherit;',
    );
    if (entry.stack) {
      consoleFn(entry.stack);
    }
  } else {
    // In production, emit structured JSON for any log collector
    consoleFn(JSON.stringify(entry));
  }
}

// ── Log queue + HTTP transport ──
const logQueue: LogEntry[] = [];
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const MAX_BATCH_SIZE = 50;

async function flushToServer(): Promise<void> {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, MAX_BATCH_SIZE);
  try {
    // Use dynamic import to avoid circular dependency with api/client
    const { api } = await import('../api/client');
    await api.post('/api/logs', { entries: batch });
  } catch {
    // Silently drop — don't recurse into logger on flush failure
    // In dev, we already emitted to console so nothing is lost
  }
}

const logger = {
  error(message: string, meta?: Record<string, unknown> | Error): void {
    if (!shouldLog('error')) return;
    const error = meta instanceof Error ? meta : undefined;
    const metaObj = meta instanceof Error ? { errorMessage: meta.message } : meta;
    const entry = formatEntry('error', message, metaObj, error);
    emit(entry);
    logQueue.push(entry);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    const entry = formatEntry('warn', message, meta);
    emit(entry);
    logQueue.push(entry);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    const entry = formatEntry('info', message, meta);
    emit(entry);
    // Only queue info+ for server in production to reduce noise
    if (!isDev) logQueue.push(entry);
  },

  debug(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    emit(formatEntry('debug', message, meta));
    // Debug logs stay browser-only — too noisy for server
  },

  /** Force flush queued entries to the server */
  flush: flushToServer,
};

// Auto-flush on interval
setInterval(flushToServer, FLUSH_INTERVAL_MS);

// Flush on page unload (best-effort via sendBeacon fallback)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logQueue.length === 0) return;
    const batch = logQueue.splice(0, MAX_BATCH_SIZE);
    // sendBeacon is fire-and-forget, works during page teardown
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      navigator.sendBeacon(
        `${apiBase}/api/logs`,
        new Blob([JSON.stringify({ entries: batch })], { type: 'application/json' })
      );
    } catch {
      // Best effort — page is closing anyway
    }
  });
}

export default logger;
export type { LogLevel, LogEntry };
