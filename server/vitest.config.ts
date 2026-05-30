import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Timeout per test (goal engine tests talk to a real DB)
    testTimeout: 15_000,
    // Run tests sequentially — they share a database
    sequence: { concurrent: false },
    // Include .ts test files
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
});
