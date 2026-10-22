# Vercel deployment

Production: https://superset-wyj.vercel.app

Project: `superset-wyj` in `abhis-projects-cf8a66e7`. Next.js is detected automatically. `package.json` pins Node 22 and pnpm 11; set `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel so the package-manager pin is honored.

## Production environment

- `DATABASE_URL`: Supabase Postgres connection string.
- `DATABASE_CA_CERT`: the complete Supabase root CA PEM contents, not a path on your laptop.
- `ENABLE_EXPERIMENTAL_COREPACK`: `1`.

Keep credentials in Vercel environment settings and ignored `.env.local`. No database credentials belong in `NEXT_PUBLIC_*` variables. Production requires Postgres. Local development uses disk-backed PGlite in ignored `.wyj-local/data`, which survives restarts but supports one server process and is not shared serverless storage. No participant room code is required; sessions are created automatically on publication.

Before deploying a schema change, apply migrations with `pnpm db:migrate` using the target database credentials. Migrations 001–006, including `006_idea_publication.sql`, are applied to shared Supabase. Run migrations against each other target database too. This command also ensures the labeled synthetic demo profiles exist.

## Deploy and verify

```sh
vercel link --project superset-wyj --scope abhis-projects-cf8a66e7
vercel deploy --prod --scope abhis-projects-cf8a66e7
```

The initial deployment used the authenticated Vercel CLI. GitHub auto-deploys are not connected: the current Vercel GitHub integration could not access the repository. Connect an authorized GitHub account in Vercel before relying on pushes to deploy. Preview environment variables have not been configured; use a separate test database when enabling previews.

Initial verification: production build and TypeScript checks passed, 169 local tests passed, and the two existing API acceptance scripts passed all 104 checks against the hosted site. Test participants created by those checks were removed; existing data was retained. The landing page and private intake were also checked in a browser.

## Browser model status: local assets for the laptop demo

The previously selected public Blob store currently returns HTTP 403 (“Your store is blocked”). Do not point visitors at it. `public/model-assets.mjs` therefore defaults to an empty `MODEL_ASSET_BASE_URL`, so browser workers load the prepared model/runtime files from this app's own `public/` directory. The laptop demo uses those local files; inference still runs on each visitor's device, not on the app server. A serverless deployment without those ignored assets supports manual entry, but must not claim local model inference is ready.

`pnpm build` runs `scripts/prepare-hosted-models.mjs`, which **always rebuilds both workers from current repository source**, in local or hosted mode. With an empty base it downloads nothing and does not require weights/WASM to complete the build. Restore or prepare the four asset directories before demonstrating inference. With a nonempty verified Blob base, the script downloads/checksum-verifies the small JavaScript runtimes and licenses from the checked manifest; models and WASM remain hosted. Worker scripts are served by the app in both modes. Blob write credentials never reach browsers.

For deployment, `MODEL_ASSET_BASE_URL` can override the laptop default during the build. Set it only to an accessible, verified public Blob prefix. The build reuses checksum-verified local runtimes when available and emits the selected public base for the workers.

Bonsai loads its external weight file explicitly, reports blocked hosting, and times out after three minutes instead of waiting indefinitely. Public weights can be cached on the device. A suspended Blob store must be restored or replaced before uncached visitors can load either model; an API key for DeepSeek does not restore Blob access.

Laya can score short custom candidates supplied explicitly in background text, such as `Skills: horse training, stable operations. Niche: equestrian matchmaking.` Only bounded source-backed labels can populate the review fields; contacts and URLs are rejected, and existing manual selections are kept. Laya does not freely generate arbitrary new labels.

Only fixed public asset GETs may use the hosted base. Private text remains in browser workers. Bonsai requires WebGPU; device memory and first-download time still matter. Manual entry remains available if assets or browser capabilities are missing. There is no hosted private-intake fallback.

Optional Premium DeepSeek enhancement and public research require the server-only `DEEPSEEK_API_KEY` in the deployment environment. Their separate exact-brief/topic-query consent flows remain required; a local key does not configure a hosted deployment. Premium remains an unpaid preview.

## Browser models outside GitHub

The prepared public weights and ONNX runtimes stay ignored by Git. The shared Drive archive is for teammate transfer/backup. For the current laptop demo, extract and serve the files locally with the app. Verified public Blob storage remains an optional hosting path, presently blocked. Preserve all four folders: `models/laya`, `models/bonsai`, `laya-runtime`, `bonsai-runtime`. Runtime versions must travel with their matching models.

1. Prepare both model sets locally (`pnpm browser:prepare`, `pnpm bonsai:prepare`), or restore the shared Drive bundle from the repo root: `mkdir -p public` then `tar -xzf /path/to/WYJ-browser-models.tar.gz -C public`. Verify the archive with the accompanying SHA-256 file before extracting. No Python companion or model conversion is needed when restoring the prepared bundle. Run `node scripts/prepare-hosted-models.mjs` afterward to refresh both browser workers from current source without fetching models. `pnpm build` also performs this worker refresh. Existing local weights and runtime files are preserved.
2. `pnpm models:upload` is a dry run; it lists the fixed public assets and total size.
3. **Optional hosted setup after the blocked-store issue is resolved:** create an accessible public Vercel Blob store. Put its `BLOB_READ_WRITE_TOKEN` in ignored `.env.local`, then run `pnpm models:upload --upload`. This uploads public weights/runtime files only, with stable paths under a versioned prefix. It does not upload `.env`, profiles, contacts or private notes. Existing names are not overwritten; choose a new `MODEL_ASSET_PREFIX` for a new runtime version.
4. Only after public GETs work, set the printed base URL in `public/model-assets.mjs`, update the checked manifest for that version, and redeploy. Keep the empty base for local demo use. The small worker scripts stay on the website; their restrictive GET-only downloaders map fixed assets directly to Blob. No token is needed for public downloads; the write token stays server-side/local.
5. Verify the hosted worker, WASM and weight files before inviting users; an upload receipt does not prove the store is publicly accessible. Actual hosted model execution still needs testing after the Blob store is unblocked. Drive share URLs are not substituted as runtime file URLs.

### Legacy cloud agent

`/api/agent` now returns 410 by default, before provider resolution. The retired free-form cloud harness cannot consume a server key merely because a caller knows the endpoint. An explicit `ENABLE_LEGACY_AGENT=true` opt-in still requires a valid participant session and Premium plan, plus the existing optional access code. Current Premium refinement remains `/api/premium/enhance` with exact saved-brief consent; Free assistance is browser-local. Premium is still a no-charge preview, not a billing entitlement.
