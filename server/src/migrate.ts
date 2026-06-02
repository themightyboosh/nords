import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 5000 });

// ── Versioned Migrations (run once, in order) ──

async function runMigrations(client: pg.PoolClient): Promise<number> {
  // Ensure schema_migrations exists (migration 001 creates it,
  // but we need to handle the very first run)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      version     TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get already-applied migrations
  const { rows: applied } = await client.query('SELECT version FROM schema_migrations ORDER BY id');
  const appliedVersions = new Set(applied.map((r: { version: string }) => r.version));

  // Read migration files in order
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    const version = file.replace('.sql', '');
    if (appliedVersions.has(version)) {
      console.log(`  ✓ ${version} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`  ▸ Applying ${version}...`);
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [version]);
    console.log(`  ✓ ${version} applied`);
    count++;
  }

  return count;
}

// ── Repeatable Functions (re-applied when file content changes) ──

async function applyFunctions(client: pg.PoolClient): Promise<number> {
  const functionsDir = path.join(__dirname, '..', 'functions');
  if (!fs.existsSync(functionsDir)) {
    return 0;
  }

  // Ensure function_checksums table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS function_checksums (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get current checksums
  const { rows: existing } = await client.query('SELECT name, checksum FROM function_checksums');
  const checksumMap = new Map(existing.map((r: { name: string; checksum: string }) => [r.name, r.checksum]));

  const files = fs.readdirSync(functionsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(functionsDir, file), 'utf-8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const existingChecksum = checksumMap.get(file);

    if (existingChecksum === checksum) {
      console.log(`  ✓ ${file} (unchanged)`);
      continue;
    }

    console.log(`  ▸ Applying ${file}${existingChecksum ? ' (changed)' : ' (new)'}...`);
    await client.query(sql);
    await client.query(
      `INSERT INTO function_checksums (name, checksum, applied_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (name) DO UPDATE SET checksum = $2, applied_at = CURRENT_TIMESTAMP`,
      [file, checksum]
    );
    console.log(`  ✓ ${file} applied`);
    count++;
  }

  return count;
}

// ── Main ──

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('\n── Versioned Migrations ──\n');
    const migrationCount = await runMigrations(client);
    if (migrationCount === 0) {
      console.log('\n  All migrations are up to date.');
    } else {
      console.log(`\n  ${migrationCount} migration(s) applied.`);
    }

    console.log('\n── Repeatable Functions ──\n');
    const functionCount = await applyFunctions(client);
    if (functionCount === 0) {
      console.log('\n  All functions are up to date.');
    } else {
      console.log(`\n  ${functionCount} function(s) applied.`);
    }

    console.log('');
  } catch (err) {
    console.error('\n  ✗ Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\n═══ Nords DB Migration Runner ═══');
migrate();
