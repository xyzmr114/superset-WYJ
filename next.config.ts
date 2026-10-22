import type { NextConfig } from 'next';

// pglite ships WASM + data files; playwright/opencode are server-only tools. Load all from node_modules.
const config: NextConfig = {
  outputFileTracingExcludes: { '/*': ['./.wyj-browser/**/*', './.wyj-runtime/**/*', './.wyj-local/**/*', './tui/**/*'] },
  // Public weights/runtime only. No profile text enters these asset requests.
  async rewrites(){
    const configured=process.env.MODEL_ASSET_BASE_URL;
    if(!configured)return [];
    const base=new URL(configured);
    if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('MODEL_ASSET_BASE_URL must be a public HTTPS asset prefix.');
    const prefix=base.href.replace(/\/$/,'');
    return {beforeFiles:['models/laya','models/bonsai','laya-runtime','bonsai-runtime'].map(dir=>({source:`/${dir}/:asset*`,destination:`${prefix}/${dir}/:asset*`})),afterFiles:[],fallback:[]};
  },
  serverExternalPackages: ['@electric-sql/pglite', 'playwright', 'playwright-core', '@opencode-ai/sdk'],
};
export default config;
