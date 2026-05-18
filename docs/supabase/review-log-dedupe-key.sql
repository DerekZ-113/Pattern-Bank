begin;

alter table public.review_log
  add column if not exists dedupe_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_log_dedupe_key_key'
      and conrelid = 'public.review_log'::regclass
  ) then
    alter table public.review_log
      add constraint review_log_dedupe_key_key unique (dedupe_key);
  end if;
end $$;

commit;
