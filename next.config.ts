import type { NextConfig } from 'next';

// PGlite ships WASM + data files; load it from node_modules instead of bundling it.
const config: NextConfig = { serverExternalPackages: ['@electric-sql/pglite'] };
export default config;
