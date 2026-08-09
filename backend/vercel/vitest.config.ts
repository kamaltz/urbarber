import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup-emulator-env.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vercel/**',
      '**/coverage/**',
    ],
    // Several test files share the same Firestore emulator instance and some (e.g.
    // availability-api.test.ts) perform indiscriminate collection-wide clears --
    // running files in parallel workers races those clears against other files'
    // writes to the same collections (bookings, slotLocks), causing nondeterministic
    // failures unrelated to the code under test. Sequential file execution trades
    // some wall-clock time for deterministic results against the shared emulator.
    fileParallelism: false,
  },
});
