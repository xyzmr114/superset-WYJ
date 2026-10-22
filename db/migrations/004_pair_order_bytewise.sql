-- The server orders a pair with JavaScript string comparison (UTF-16 code units). The default
-- collation orders mixed-case ids and '-'/'_' differently, so `a < b` randomly rejected valid
-- pairs. Compare bytewise ("C"), which matches JS ordering for our ASCII ids.
alter table matches drop constraint matches_check;
alter table matches add constraint matches_pair_order check (a collate "C" < b collate "C");
