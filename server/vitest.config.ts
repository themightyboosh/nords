import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Timeout per test — 30s accommodates Cloud SQL proxy latency
    testTimeout: 30_000,
    // Run test files ONE AT A TIME to avoid exhausting Cloud SQL
    // connection slots (each file creates a pool with max=20,
    // and the DB allows ~100 total connections).
    fileParallelism: false,
    // Within each file, run tests sequentially — they share a database
    sequence: { concurrent: false },
    // Include .ts test files, exclude manual scripts
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['src/tests/test-*.ts', 'node_modules'],
  },
});
