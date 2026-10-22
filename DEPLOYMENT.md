# Vercel deployment

Production: https://superset-wyj.vercel.app

Project: `superset-wyj` in `abhis-projects-cf8a66e7`. Next.js is detected automatically. `package.json` pins Node 22 and pnpm 11; set `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel so the package-manager pin is honored.

## Production environment

- `DATABASE_URL`: Supabase Postgres connection string.
- `DATABASE_CA_CERT`: the complete Supabase root CA PEM contents, not a path on your laptop.
- `EVENT_CODE`: the room code participants use to join.
- `ENABLE_EXPERIMENTAL_COREPACK`: `1`.

Keep credentials in Vercel environment settings and ignored `.env.local`. No database credentials belong in `NEXT_PUBLIC_*` variables. Production requires Postgres; the local in-memory fallback does not provide shared, durable serverless storage.

Before deploying a schema change, apply migrations with `pnpm db:migrate` using the target database credentials. Migrations 001–005 were applied for the initial deployment. This command also ensures the labeled synthetic demo profiles exist.

## Deploy and verify

```sh
vercel link --project superset-wyj --scope abhis-projects-cf8a66e7
vercel deploy --prod --scope abhis-projects-cf8a66e7
```

The initial deployment used the authenticated Vercel CLI. GitHub auto-deploys are not connected: the current Vercel GitHub integration could not access the repository. Connect an authorized GitHub account in Vercel before relying on pushes to deploy. Preview environment variables have not been configured; use a separate test database when enabling previews.

Initial verification: production build and TypeScript checks passed, 169 local tests passed, and the two existing API acceptance scripts passed all 104 checks against the hosted site. Test participants created by those checks were removed; existing data was retained. The landing page and private intake were also checked in a browser.

## Features not configured

The first deployment uses the manual reviewed-brief path. Browser Laya assets are generated locally, ignored by Git, and absent from this deployment. Preparing and hosting them is a separate step; see [browser Laya setup](scripts/browser-laya/README.md). Never send private intake text to a hosted classifier as a fallback.

Optional DeepSeek enhancement is not configured. To enable it, set the server-only `DEEPSEEK_API_KEY` and redeploy; preserve the existing exact-brief consent flow. Premium remains an unpaid preview.

## Browser models outside GitHub

The prepared public weights and ONNX runtimes stay ignored by Git. A Drive archive is for teammate transfer/backup; the website serves the extracted files from public Blob storage. Preserve all four folders: `models/laya`, `models/bonsai`, `laya-runtime`, `bonsai-runtime`. Runtime versions must travel with their matching models.

1. Prepare both model sets locally (`pnpm browser:prepare`, `pnpm bonsai:prepare`), or restore the shared Drive bundle from the repo root: `mkdir -p public` then `tar -xzf /path/to/WYJ-browser-models.tar.gz -C public`. Verify the archive with the accompanying SHA-256 file before extracting. No Python companion or model conversion is needed when restoring the prepared bundle.
2. `pnpm models:upload` is a dry run; it lists the fixed public assets and total size.
3. Create a public Vercel Blob store. Put its `BLOB_READ_WRITE_TOKEN` in ignored `.env.local`, then run `pnpm models:upload --upload`. This uploads public weights/runtime files only, with stable paths under a versioned prefix. It does not upload `.env`, profiles, contacts or private notes. Existing names are not overwritten; choose a new `MODEL_ASSET_PREFIX` for a new runtime version.
4. Set the printed `MODEL_ASSET_BASE_URL` in the Vercel project and redeploy. Next proxies only the four fixed asset directories, so existing same-origin workers and their restrictive GET-only asset rules remain intact. No token is needed for public downloads; the write token stays server-side/local.
5. Verify the hosted worker, WASM and weight files before inviting users. Actual hosted model execution still needs testing after the Blob upload. Drive share URLs are not substituted as runtime file URLs.

### Legacy cloud agent

`/api/agent` now returns 410 by default, before provider resolution. The retired free-form cloud harness cannot consume a server key merely because a caller knows the endpoint. An explicit `ENABLE_LEGACY_AGENT=true` opt-in still requires a valid participant session and Premium plan, plus the existing optional access code. Current Premium refinement remains `/api/premium/enhance` with exact saved-brief consent; Free assistance is browser-local. Premium is still a no-charge preview, not a billing entitlement.
