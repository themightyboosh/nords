/**
 * Backfill missing migration tracking records and then run pending migrations.
 * One-time fix for the schema_migrations table that was missing INSERT records.
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 5000 });

async function fix() {
  const client = await pool.connect();
  try {
    // Get already-tracked migrations
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY id');
    const tracked = new Set(rows.map((r: { version: string }) => r.version));

    // List all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    // For each migration file, check if it's been applied (table/column exists)
    // and add tracking record if missing
    for (const file of files) {
      const version = file.replace('.sql', '');
      if (tracked.has(version)) {
        console.log(`  ✓ ${version} (tracked)`);
        continue;
      }

      // Try to apply the migration — if it fails with "already exists", just track it
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      try {
        console.log(`  ▸ Applying ${version}...`);
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        console.log(`  ✓ ${version} applied and tracked`);
      } catch (err: any) {
        if (err.message.includes('already exists') || err.message.includes('duplicate') || err.code === '23505') {
          // Already applied but not tracked — try to track it
          try {
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
            console.log(`  ⊕ ${version} already applied, now tracked`);
          } catch {
            console.log(`  ⊕ ${version} already applied and tracked`);
          }
        } else {
          throw err;
        }
      }
    }

    console.log('\nDone.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\n═══ Migration Fix & Backfill ═══\n');
fix();
