-- Supabase exposes the public schema through its REST API. RLS with no policies blocks that API
-- entirely; our server connects as the table owner, which bypasses RLS, so the app is unaffected.
alter table participants enable row level security;
alter table identities enable row level security;
alter table cards enable row level security;
alter table matches enable row level security;
alter table pitches enable row level security;
alter table schema_migrations enable row level security;
