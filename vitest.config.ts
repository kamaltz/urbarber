import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./src/*" path mapping. Without this, any
  // unit test that imports a real (unmocked) module using a "@/..." import throws
  // "Cannot find package '@/...'" -- most existing tests avoided this only because
  // they happened to mock away every "@/"-aliased dependency, not because
  // resolution actually worked.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // __DEV__ is a React Native global normally injected by Metro/Babel; it's
  // referenced throughout the app's error-handling (e.g. `if (__DEV__) console.warn(...)`)
  // but was previously undefined under plain vitest, crashing any test that
  // exercised an error path. Mirrors a dev build, matching how tests run.
  define: {
    __DEV__: 'true',
  },
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
