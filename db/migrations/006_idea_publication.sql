-- Withdrawal retains approved brief history and introduction receipts.
alter table ideas add column published boolean not null default true;
alter table ideas add column unpublished_at timestamptz;
