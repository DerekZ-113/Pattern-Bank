begin;

alter table public.problems
  add column if not exists five_star_streak integer;

commit;
