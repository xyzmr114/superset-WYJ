import type { NextConfig } from 'next';

// pglite ships WASM + data files; playwright/opencode are server-only tools. Load all from node_modules.
const config: NextConfig = {
  // Local two-person walkthrough uses an independent loopback browser session.
  allowedDevOrigins: ['127.0.0.1'],
  outputFileTracingExcludes: { '/*': ['./.wyj-browser/**/*', './.wyj-runtime/**/*', './.wyj-local/**/*', './tui/**/*'] },
  serverExternalPackages: ['@electric-sql/pglite', 'playwright', 'playwright-core', '@opencode-ai/sdk'],
};
export default config;
