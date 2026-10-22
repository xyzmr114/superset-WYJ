-- Persist idea collections and preview plans; freeze the brief attached to each pairing.
alter table cards add column idea_id text, add column preferences jsonb;
create table ideas (
  idea_id text primary key,
  participant_id text not null references participants(id) on delete cascade,
  card jsonb not null,
  created_at timestamptz not null default now()
);
create index ideas_participant_idx on ideas(participant_id, created_at);
create table participant_plans (
  participant_id text primary key references participants(id) on delete cascade,
  plan text not null check (plan in ('free', 'premium'))
);
alter table matches add column a_card jsonb, add column b_card jsonb,
  add column a_idea_id text not null default 'legacy', add column b_idea_id text not null default 'legacy';
update matches m set a_card = jsonb_build_object(
  'id', c.participant_id, 'eventId', c.event_id, 'alias', c.alias, 'offers', c.offers,
  'seeks', c.seeks, 'interests', c.interests, 'availability', c.availability,
  'approvedBlurb', c.approved_blurb, 'version', c.version)
from cards c where c.participant_id=m.a;
update matches m set b_card = jsonb_build_object(
  'id', c.participant_id, 'eventId', c.event_id, 'alias', c.alias, 'offers', c.offers,
  'seeks', c.seeks, 'interests', c.interests, 'availability', c.availability,
  'approvedBlurb', c.approved_blurb, 'version', c.version)
from cards c where c.participant_id=m.b;
alter table matches drop constraint matches_a_b_key;
alter table matches add constraint matches_idea_pair_key unique(a,b,a_idea_id,b_idea_id);
create table trials (
  match_id text primary key references matches(id) on delete cascade,
  version integer not null,
  goal text not null,
  deliverable text not null,
  a_contribution text not null,
  b_contribution text not null,
  deadline timestamptz not null,
  a_approved boolean not null default false,
  b_approved boolean not null default false,
  a_feedback text check (a_feedback in ('continue','pass')),
  b_feedback text check (b_feedback in ('continue','pass'))
);
alter table ideas enable row level security;
alter table participant_plans enable row level security;
alter table trials enable row level security;
