// Creates/updates the schema and seeds the synthetic demo profiles.
// Usage: pnpm db:migrate   (reads DATABASE_URL from .env.local or the environment)
import { connect, migrate, seed } from '../lib/server/store';

async function main() {
  try { process.loadEnvFile('.env.local'); } catch { /* fine: use the shell environment */ }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Put it in .env.local (see db/README.md).');
    process.exit(1);
  }
  const db = connect(url);
  try {
    await migrate(db, (name) => console.log(`applied ${name}`));
    await seed(db);
    const [{ n }] = await db.q('select count(*)::int as n from cards');
    console.log(`ok: schema up to date, ${n} cards in the database.`);
  } catch (err) {
    console.error('migration failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

void main();
