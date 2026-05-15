begin;

create table if not exists public.leetcode_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  leetcode_username text not null,
  leetcode_display_name text,
  leetcode_avatar_url text,
  leetcode_total_solved integer,
  last_seen_accepted_count integer,
  last_synced_at timestamptz,
  last_sync_started_at timestamptz,
  sync_status text not null default 'idle'
    check (sync_status in ('idle', 'syncing', 'synced', 'error', 'no_visible_submissions', 'rate_limited')),
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leetcode_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  leetcode_username text not null,
  leetcode_submission_id text not null,
  title_slug text not null,
  title text not null,
  leetcode_number integer,
  difficulty text check (difficulty is null or difficulty in ('Easy', 'Medium', 'Hard')),
  submitted_at timestamptz not null,
  problem_id text,
  status text not null default 'detected'
    check (status in ('detected', 'linked_existing', 'pending', 'imported', 'ignored', 'rated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, leetcode_submission_id)
);

create index if not exists leetcode_submissions_user_submitted_at_idx
  on public.leetcode_submissions (user_id, submitted_at desc);

create index if not exists leetcode_submissions_user_title_slug_idx
  on public.leetcode_submissions (user_id, title_slug);

create index if not exists leetcode_submissions_user_status_idx
  on public.leetcode_submissions (user_id, status);

alter table public.leetcode_connections enable row level security;
alter table public.leetcode_submissions enable row level security;

drop policy if exists "Users can read own LeetCode connection" on public.leetcode_connections;
create policy "Users can read own LeetCode connection"
on public.leetcode_connections
for select
using (auth.uid() = user_id);

-- Browser clients are read-only for LeetCode activity. The Edge Function writes
-- with the service role after validating public LeetCode data server-side.
drop policy if exists "Users can insert own LeetCode connection" on public.leetcode_connections;
drop policy if exists "Users can update own LeetCode connection" on public.leetcode_connections;
drop policy if exists "Users can delete own LeetCode connection" on public.leetcode_connections;

drop policy if exists "Users can read own LeetCode submissions" on public.leetcode_submissions;
create policy "Users can read own LeetCode submissions"
on public.leetcode_submissions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own LeetCode submissions" on public.leetcode_submissions;
drop policy if exists "Users can update own LeetCode submissions" on public.leetcode_submissions;
drop policy if exists "Users can delete own LeetCode submissions" on public.leetcode_submissions;

commit;
