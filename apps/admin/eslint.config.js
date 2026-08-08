import type { ESLint } from 'eslint';

const config: ESLint.ConfigData = {
  extends: ['next'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};

export default config;
