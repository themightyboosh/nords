import pg from 'pg';
import logger from './lib/logger.js';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL is not set. Cloud DB connection is required.');
}

// Connection limits strict for serverless/Cloud Run environments
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message, stack: err.stack });
  process.exit(-1);
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
