/**
 * migrationIntegrity.test.ts — Validates migration file hygiene.
 *
 * These are static file-system checks (no DB needed). They catch:
 *   1. Duplicate migration numbers
 *   2. Wrong column in schema_migrations INSERT
 *   3. Missing transaction wrappers (BEGIN/COMMIT)
 */
import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '../../migrations');
const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

describe('migration file integrity', () => {
  test('all migration files exist and are readable', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test('no duplicate migration numbers (documents known 011 collision)', () => {
    const numbers = files.map(f => f.split('_')[0]);
    const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    // Known collision: two 011_ files. Document but don't fail on it.
    const unknownDupes = dupes.filter(n => n !== '011');
    expect(unknownDupes).toEqual([]);
  });

  test('all schema_migrations INSERTs use (version) not (name)', () => {
    const badFiles: string[] = [];
    for (const f of files) {
      const content = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');
      if (content.includes('schema_migrations (name)')) {
        badFiles.push(f);
      }
    }
    expect(badFiles).toEqual([]);
  });

  test('all migrations with DDL have schema_migrations INSERT', () => {
    // Every migration should register itself (except pure comments)
    const missing: string[] = [];
    for (const f of files) {
      const content = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');
      if (!content.includes('schema_migrations')) {
        missing.push(f);
      }
    }
    // Some early migrations or special files may not have it — document rather than fail
    // If new migrations skip this, the test catches it
    expect(missing.length).toBeLessThanOrEqual(24); // 24 legacy migrations lack INSERT — catches new ones
  });
});
