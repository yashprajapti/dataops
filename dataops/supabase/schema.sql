-- ============================================================================
-- DataOps · Supabase schema
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- Then also run migration_002_limits_and_reports.sql (upload limit + report features).
-- Every table has Row Level Security: a user can only ever see their own rows.
-- ============================================================================

-- 1. Profiles (one row per user, created automatically on sign-up) -----------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text,
  email             text,
  role              text        not null default 'Data Analyst',
  company           text        not null default '',
  bio               text        not null default '',
  location          text        not null default 'India',
  avatar_seed       text,
  avatar_url        text,
  plan              text        not null default 'Starter' check (plan in ('Starter', 'Pro', 'Enterprise')),
  settings          jsonb       not null default '{}'::jsonb,
  usage             jsonb       not null default '{"queries":0,"tokens":0}'::jsonb,
  active_dataset_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2. Datasets (uploaded CSV rows are stored as JSON) --------------------------
create table if not exists public.datasets (
  id          text        primary key,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name        text        not null,
  source      text        not null check (source in ('sample', 'upload')),
  sample_id   text,
  rows        jsonb,
  row_count   integer     not null default 0,
  cleaned     boolean     not null default false,
  clean_log   jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists datasets_user_created_idx on public.datasets (user_id, created_at desc);

-- 3. Chats (one row per user per agent) ---------------------------------------
create table if not exists public.chats (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  agent       text        not null check (agent in ('cleaner', 'sql', 'viz', 'marketing', 'advisor')),
  messages    jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, agent)
);

-- 4. Row Level Security --------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.datasets enable row level security;
alter table public.chats    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own datasets" on public.datasets;
create policy "own datasets" on public.datasets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chats" on public.chats;
create policy "own chats" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Auto-create a profile when someone signs up (email or Google) ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, avatar_seed, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'Data Analyst'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Keep updated_at fresh -------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();

drop trigger if exists chats_touch on public.chats;
create trigger chats_touch before update on public.chats
  for each row execute procedure public.touch_updated_at();
