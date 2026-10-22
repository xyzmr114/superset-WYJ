-- Per-pair introduction consent: what each side released, frozen at approval time.
-- The reveal reads these snapshots, never the mutable identities table.
alter table matches
  add column a_identity     jsonb,
  add column b_identity     jsonb,
  add column a_approved_at  timestamptz,
  add column b_approved_at  timestamptz,
  add column a_card_version int,
  add column b_card_version int;
