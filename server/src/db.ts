import pg from 'pg';
import logger from './lib/logger.js';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL is not set. Cloud DB connection is required.');
}

// Connection limits — reduced during tests to avoid exhausting Cloud SQL slots
const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isTest ? 5 : 20,
  idleTimeoutMillis: isTest ? 5000 : 10000,
  connectionTimeoutMillis: 20000,
});

// Validate connections on checkout — catches stale connections after Cloud SQL proxy restarts
const originalConnect = pool.connect.bind(pool);
pool.connect = async function () {
  const client = await originalConnect();
  try {
    await client.query('SELECT 1');
    return client;
  } catch (err) {
    client.release(true); // destroy the bad connection
    logger.warn('Stale connection detected, retrying', { error: err instanceof Error ? err.message : String(err) });
    return originalConnect(); // get a fresh one
  }
};

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message, stack: err.stack });
  process.exit(1);
});

pool.on('connect', () => {
  logger.debug('New client connected to pool');
});

/**
 * Generic query utility enforcing typed returns from pg
 */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { text: text.slice(0, 80), duration, rows: res.rowCount });
    return res.rows as T[];
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
      text: text.slice(0, 120),
      duration,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

/**
 * Single item return
 */
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export { pool };
