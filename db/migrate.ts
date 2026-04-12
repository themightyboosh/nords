import fs from 'node:fs/promises';
import path from 'node:path';
import pkg from 'pg';
const { Pool } = pkg;

// Determine environment - use DATABASE_URL from .env or fallback
const connectionString = process.env.DATABASE_URL || 'postgres://danielcrowder@127.0.0.1:5432/nords_dev';

const pool = new Pool({ connectionString });

async function initMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations() {
  const result = await pool.query('SELECT name FROM schema_migrations ORDER BY id ASC');
  return new Set(result.rows.map(r => r.name));
}

async function runMigrations() {
  await initMigrationTable();
  const executed = await getExecutedMigrations();
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort(); // Sorting by 001_..., 002_...

  let appliedCount = 0;

  for (const file of sqlFiles) {
    if (executed.has(file)) {
      continue;
    }

    console.log(`Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✓ successfully applied ${file}`);
      appliedCount++;
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed to apply migration ${file}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (appliedCount === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`Successfully applied ${appliedCount} migrations.`);
  }

  await pool.end();
}

async function runRollback() {
  await initMigrationTable();
  const result = await pool.query('SELECT name FROM schema_migrations ORDER BY id DESC LIMIT 1');
  if (result.rows.length === 0) {
    console.log('No migrations to rollback.');
    await pool.end();
    return;
  }
  
  const file = result.rows[0].name;
  console.error(`Rollback command called for ${file}, but down-migrations are not natively supported with single raw .sql files without 'down' companion files. Implement down files if rollback is strictly required.`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] === 'rollback') {
  runRollback();
} else {
  runMigrations();
}
