> **Current pivot · 22 October 2026:** Read [PIVOT.md](../PIVOT.md) and the [four-person handoff](../WOULD_YOU_JUMP_HANDOFF.md). Private founder matchmaking is the current product. Older module notes below are implementation references; the current pivot and ownership take precedence.

# Database (Supabase Postgres)

Schema: `db/migrations/*.sql`, applied in name order by `pnpm db:migrate`. Server code: `lib/server/store.ts`.
The app uses plain Postgres through the `pg` driver. It doesn't use the supabase-js client or Supabase keys.

- **`DATABASE_URL` set** → the app uses that Postgres (Supabase).
- **`DATABASE_URL` empty** → the app starts an in-memory Postgres (PGlite). No setup, but data resets on restart, and it only works with a single server process. Fine for local dev, not for the demo.

## 1. Create the project (free, ~5 minutes)

1. Sign up at https://supabase.com/dashboard and click **New project**.
2. Name: `would-you-jump`. Set a **database password** and save it, because you'll need it in step 2. Avoid `@ : / ? #` in it, or URL-encode those characters later.
3. Region: closest to where the app runs. For Vercel's default region, pick **East US (North Virginia)**.
4. Plan: **Free**. Free projects pause after about a week with no activity; click **Restore** in the dashboard if that happens.

## 2. Get the connection string and certificate

1. In the project, click **Connect** (top bar).
2. Under **Connection string**, choose **Transaction pooler** (port `6543`). It works over IPv4 and suits Vercel. Don't use the "Direct connection" string, because it's IPv6-only and many home and Wi-Fi networks can't reach it.
   It looks like:
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   Replace `[YOUR-PASSWORD]` (including the brackets) with your password.
3. **Project Settings → Database → SSL Configuration → Download certificate**. This saves `prod-ca-2021.crt`. Supabase signs connections with its own certificate authority, so the app needs this file to verify it's really talking to Supabase.
   - Locally: put the file in the project root and set `DATABASE_CA_CERT=prod-ca-2021.crt` (`*.crt` is gitignored).
   - On Vercel: paste the **file contents** (everything from `-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----`) as the value of `DATABASE_CA_CERT`.

## 3. Create the tables

```sh
cp .env.example .env.local          # if you don't have it yet
# edit .env.local:
#   DATABASE_URL=<the string from step 2, with your password>
#   DATABASE_CA_CERT=prod-ca-2021.crt
pnpm db:migrate
```

Expected output:
```
applied 001_init.sql
applied 002_enable_rls.sql
ok: schema up to date, 6 cards in the database.
```
It's safe to run again. Already applied migrations are skipped, and the 6 synthetic demo profiles are only inserted once. You can now see the tables in Supabase's **Table Editor**.

`002_enable_rls.sql` turns on Row Level Security with no policies. That blocks Supabase's public REST API from reading the tables. The app's server connects as the owner of the tables, so it isn't affected.

## 4. Check it end to end

```sh
pnpm build && pnpm start            # uses .env.local
pnpm acceptance                     # in a second terminal; expect "45 passed, 0 failed"
```

## 5. Deploy (Vercel)

1. Import the GitHub repo at https://vercel.com/new.
2. **Settings → Environment Variables**: add `DATABASE_URL` and `DATABASE_CA_CERT` (the PEM contents), plus optionally `EVENT_CODE`, `GITHUB_TOKEN` and `MODEL_API_*`.
3. **Settings → Functions → Region**: pick the same region as the Supabase project.
4. Deploy, then run `BASE_URL=https://<your-app>.vercel.app pnpm acceptance`.

To wipe the event after a rehearsal, run this in Supabase's **SQL Editor**:
```sql
delete from participants where token_hash is not null;   -- keeps the synthetic profiles; cascades to cards, identities, matches, pitches
```

## Changing the schema

Add a new file such as `db/migrations/003_<what>.sql` and run `pnpm db:migrate`. Never edit a migration that has already been applied.

## Troubleshooting

- `pnpm` crashes with `node:sqlite` → you're on Node 20. Run `fnm use 22` (or `nvm use 22`).
- `self-signed certificate in certificate chain` → `DATABASE_CA_CERT` is missing or wrong (see step 2.3).
- `ENOTFOUND` / `ENETUNREACH` on `db.xxxx.supabase.co` → you used the direct connection string. Use the Transaction pooler one.
- `password authentication failed` → wrong password, or you left the `[ ]` brackets in. Reset it under **Project Settings → Database**.
- `Tenant or user not found` → the username must be `postgres.<project-ref>` exactly as shown in the pooler string.
