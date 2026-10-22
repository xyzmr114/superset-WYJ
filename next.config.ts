import type {NextConfig} from 'next';
const config:NextConfig={outputFileTracingExcludes:{'/*':['./.wyj-browser/**/*','./.wyj-runtime/**/*','./tui/**/*']},serverExternalPackages:['playwright','playwright-core','@opencode-ai/sdk']};
export default config;
