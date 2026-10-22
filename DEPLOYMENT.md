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

Laya and Bonsai weights and WASM files are hosted in the public `wyj-browser-models` Blob store, under the immutable `wyj-20261022` prefix. `public/model-assets.mjs` selects that public asset base. Builds download and checksum-verify the small runtime files using `scripts/browser-models-manifest.json`, then rebuild the workers from repository source. Weights stay outside Git and the website deployment. Blob write credentials are never shipped to browsers.

Only fixed model/runtime GETs are redirected to Blob. Private text remains inside each browser worker. Bonsai requires WebGPU; device memory and first-download time still matter. Manual entry remains available. Never send private intake text to a hosted classifier as a fallback.

Bonsai loads its external weight file explicitly, reports blocked hosting, and times out after three minutes instead of waiting indefinitely. Public weights can be cached on the device. A suspended Blob store must be restored or replaced before uncached visitors can load either model; an API key for DeepSeek does not restore Blob access.

Laya can score short custom candidates supplied explicitly in background text, such as `Skills: horse training, stable operations. Niche: equestrian matchmaking.` Only bounded source-backed labels can populate the review fields; contacts and URLs are rejected, and existing manual selections are kept. Laya does not freely generate arbitrary new labels.

Optional DeepSeek enhancement is not configured. To enable it, set the server-only `DEEPSEEK_API_KEY` and redeploy; preserve the existing exact-brief consent flow. Premium remains an unpaid preview.

## Browser models outside GitHub

The prepared public weights and ONNX runtimes stay ignored by Git. A Drive archive is for teammate transfer/backup; the website serves the extracted files from public Blob storage. Preserve all four folders: `models/laya`, `models/bonsai`, `laya-runtime`, `bonsai-runtime`. Runtime versions must travel with their matching models.

1. Prepare both model sets locally (`pnpm browser:prepare`, `pnpm bonsai:prepare`), or restore the shared Drive bundle from the repo root: `mkdir -p public` then `tar -xzf /path/to/WYJ-browser-models.tar.gz -C public`. Verify the archive with the accompanying SHA-256 file before extracting. No Python companion or model conversion is needed when restoring the prepared bundle. Run `pnpm bonsai:prepare` afterward to refresh the browser worker from current source; existing weights are reused. Alternatively apply the small shared Bonsai runtime update archive over `public/`.
2. `pnpm models:upload` is a dry run; it lists the fixed public assets and total size.
3. Create a public Vercel Blob store. Put its `BLOB_READ_WRITE_TOKEN` in ignored `.env.local`, then run `pnpm models:upload --upload`. This uploads public weights/runtime files only, with stable paths under a versioned prefix. It does not upload `.env`, profiles, contacts or private notes. Existing names are not overwritten; choose a new `MODEL_ASSET_PREFIX` for a new runtime version.
4. Set the printed base URL in `public/model-assets.mjs`, update the checked manifest for that version, and redeploy. The small worker scripts stay on the website; their restrictive GET-only downloaders map fixed assets directly to Blob. No token is needed for public downloads; the write token stays server-side/local.
5. Verify the hosted worker, WASM and weight files before inviting users. Actual hosted model execution still needs testing after the Blob upload. Drive share URLs are not substituted as runtime file URLs.

### Legacy cloud agent

`/api/agent` now returns 410 by default, before provider resolution. The retired free-form cloud harness cannot consume a server key merely because a caller knows the endpoint. An explicit `ENABLE_LEGACY_AGENT=true` opt-in still requires a valid participant session and Premium plan, plus the existing optional access code. Current Premium refinement remains `/api/premium/enhance` with exact saved-brief consent; Free assistance is browser-local. Premium is still a no-charge preview, not a billing entitlement.
