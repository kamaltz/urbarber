import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // apps/admin has its own package-lock.json, but Next.js's multi-lockfile
  // detection otherwise infers the outer monorepo root (which has its own,
  // incompatible ESLint major version) as the workspace root. Pin it explicitly.
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // `next build`'s built-in ESLint integration cannot construct a working
    // ESLint instance in this workspace layout (fails with "Invalid Options:
    // Unknown options: useEslintrc, extensions..." regardless of this flag,
    // a known upstream Next 15 flat-config incompatibility) -- it neither
    // lints nor blocks the build either way. `npm run lint` (plain `eslint`
    // CLI, see package.json) is the real, working gate and must be run
    // as part of `npm run check` / CI, not this build-time hook.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
