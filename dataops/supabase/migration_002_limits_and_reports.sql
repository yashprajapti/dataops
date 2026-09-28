-- ============================================================================
-- DataOps · Migration 002 — upload limit, query log, cleaned-file links
-- Already ran schema.sql? Run THIS file once too (SQL Editor → New query → Run).
-- Safe to run more than once.
-- ============================================================================

-- 1. New columns ------------------------------------------------------------------
alter table public.datasets add column if not exists queries   jsonb not null default '[]'::jsonb;  -- SQL run on this dataset
alter table public.datasets add column if not exists parent_id text;                               -- cleaned copy → original
alter table public.profiles add column if not exists uploads_used integer not null default 0;      -- lifetime CSV uploads

-- 2. Free plan: max 15 dataset uploads (enforced by the database, not just the UI) --
create or replace function public.enforce_upload_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_plan text;
  v_used integer;
begin
  -- sample datasets and cleaned copies of an existing dataset don't count
  if new.source <> 'upload' or (new.cleaned and new.parent_id is not null) then
    return new;
  end if;

  select plan, uploads_used into v_plan, v_used from public.profiles where id = new.user_id for update;

  if coalesce(v_plan, 'Starter') = 'Starter' and coalesce(v_used, 0) >= 15 then
    raise exception 'UPLOAD_LIMIT_REACHED: the free plan allows 15 dataset uploads. Upgrade to Pro for unlimited uploads.'
      using errcode = 'P0001';
  end if;

  perform set_config('dataops.internal', 'on', true);
  update public.profiles set uploads_used = coalesce(uploads_used, 0) + 1 where id = new.user_id;
  perform set_config('dataops.internal', 'off', true);
  return new;
end;
$$;

drop trigger if exists datasets_upload_limit on public.datasets;
create trigger datasets_upload_limit
  before insert on public.datasets
  for each row execute procedure public.enforce_upload_limit();

-- 3. Users can't reset their own counter or give themselves a paid plan ------------
--    (you, the owner, can still change `plan` from the Supabase Table Editor)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and coalesce(current_setting('dataops.internal', true), 'off') <> 'on' then
    new.uploads_used := old.uploads_used;
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_fields();
