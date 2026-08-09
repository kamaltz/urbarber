import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Backend has its own vitest config/setup (env, Firestore emulator wiring) and
    // its own dedicated command: `npm --prefix backend/vercel run test`. Excluding it
    // here keeps the documented split (root test:unit = mobile, backend test = backend)
    // intact -- without this, backend/vercel/tests/*.test.ts was being silently picked
    // up by the root run with no env setup.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.vercel/**',
      '**/coverage/**',
      'backend/vercel/**',
      'apps/admin/**',
    ],
  },
});
