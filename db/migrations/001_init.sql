-- Would You Jump? initial schema. Applied by `pnpm db:migrate` (see db/README.md).
-- Identities live apart from cards and are only read on mutual reveal.

create table participants (
  id         text primary key,
  event_id   text not null,
  token_hash text unique,              -- sha256 of the session cookie; null = synthetic demo profile (can never log in)
  created_at timestamptz not null default now()
);

create table identities (
  participant_id text primary key references participants(id) on delete cascade,
  display_name   text not null,
  contact        text not null
);

create table cards (
  participant_id text primary key references participants(id) on delete cascade,
  event_id       text not null,
  alias          text not null,
  offers         text[] not null,
  seeks          text[] not null,
  interests      text[] not null,
  availability   text not null check (availability in ('exploring', 'weekends', 'full_time')),
  approved_blurb text not null,
  version        integer not null default 1
);
create index cards_event_idx on cards (event_id);

-- One row per pair, stored with a < b so (a, b) is unique regardless of who generated it.
create table matches (
  id          text primary key,
  event_id    text not null,
  a           text not null references participants(id) on delete cascade,
  b           text not null references participants(id) on delete cascade,
  score       real not null,
  opportunity jsonb not null,
  evidence    jsonb not null,
  a_approved  boolean not null default false,
  b_approved  boolean not null default false,
  declined_by text,
  created_at  timestamptz not null default now(),
  check (a < b),
  unique (a, b)
);
create index matches_b_idx on matches (b);

-- One draft per match. Any edit bumps version and clears both approvals.
create table pitches (
  id                 text primary key,
  match_id           text not null unique references matches(id) on delete cascade,
  version            integer not null default 1,
  markdown           text not null,
  a_fields           text[] not null default '{}',   -- identity fields participant a chose to export
  b_fields           text[] not null default '{}',
  a_approved_version integer,
  b_approved_version integer
);
