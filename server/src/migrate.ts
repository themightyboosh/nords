import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL || 'postgres://danielcrowder@127.0.0.1:5432/nords_dev';

const pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 5000 });

async function migrate() {
  const client = await pool.connect();
  try {
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
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      console.log(`  ✓ ${version} applied`);
      count++;
    }

    if (count === 0) {
      console.log('\n  All migrations are up to date.\n');
    } else {
      console.log(`\n  ${count} migration(s) applied successfully.\n`);
    }
  } catch (err) {
    console.error('\n  ✗ Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\n═══ Nords DB Migration Runner ═══\n');
migrate();
