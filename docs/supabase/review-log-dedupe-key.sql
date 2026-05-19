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

alter table public.review_log enable row level security;

grant select, insert, update, delete on public.review_log to authenticated;

drop policy if exists "Users can read own review log" on public.review_log;
create policy "Users can read own review log"
on public.review_log
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own review log" on public.review_log;
create policy "Users can insert own review log"
on public.review_log
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own review log" on public.review_log;
create policy "Users can update own review log"
on public.review_log
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own review log" on public.review_log;
create policy "Users can delete own review log"
on public.review_log
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
