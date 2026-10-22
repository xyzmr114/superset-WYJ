import type { NextConfig } from 'next';

// pglite ships WASM + data files; playwright/opencode are server-only tools. Load all from node_modules.
const config: NextConfig = {
  outputFileTracingExcludes: { '/*': ['./.wyj-browser/**/*', './.wyj-runtime/**/*', './.wyj-local/**/*', './tui/**/*'] },
  serverExternalPackages: ['@electric-sql/pglite', 'playwright', 'playwright-core', '@opencode-ai/sdk'],
};
export default config;
