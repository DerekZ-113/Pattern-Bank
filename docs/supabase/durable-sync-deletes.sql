begin;

create table if not exists public.problem_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id text not null,
  deleted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create index if not exists problem_tombstones_user_deleted_at_idx
  on public.problem_tombstones (user_id, deleted_at desc);

create table if not exists public.user_data_resets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reset_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.problem_tombstones enable row level security;
alter table public.user_data_resets enable row level security;

drop policy if exists "Users can read own problem tombstones" on public.problem_tombstones;
create policy "Users can read own problem tombstones"
on public.problem_tombstones
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own problem tombstones" on public.problem_tombstones;
create policy "Users can insert own problem tombstones"
on public.problem_tombstones
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own problem tombstones" on public.problem_tombstones;
create policy "Users can update own problem tombstones"
on public.problem_tombstones
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own problem tombstones" on public.problem_tombstones;
create policy "Users can delete own problem tombstones"
on public.problem_tombstones
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own data reset" on public.user_data_resets;
create policy "Users can read own data reset"
on public.user_data_resets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own data reset" on public.user_data_resets;
create policy "Users can insert own data reset"
on public.user_data_resets
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own data reset" on public.user_data_resets;
create policy "Users can update own data reset"
on public.user_data_resets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own data reset" on public.user_data_resets;
create policy "Users can delete own data reset"
on public.user_data_resets
for delete
using (auth.uid() = user_id);

commit;
