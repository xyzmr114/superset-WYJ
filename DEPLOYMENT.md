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
