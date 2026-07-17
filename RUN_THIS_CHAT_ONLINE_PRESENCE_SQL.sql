
-- CHAT ONLINE PRESENCE FIX SQL
-- Run this in the matching Supabase SQL Editor.
-- This makes the green online/offline dot reliable.

create extension if not exists pgcrypto;

create table if not exists public.team_presence (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  is_online boolean default true,
  current_page text,
  last_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.team_presence
  add column if not exists user_email text,
  add column if not exists is_online boolean default true,
  add column if not exists current_page text,
  add column if not exists last_seen_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_team_presence_user_email_unique on public.team_presence(lower(coalesce(user_email,'')));
create index if not exists idx_team_presence_last_seen on public.team_presence(last_seen_at desc);

alter table public.team_presence enable row level security;

drop policy if exists team_presence_select on public.team_presence;
drop policy if exists team_presence_insert on public.team_presence;
drop policy if exists team_presence_update on public.team_presence;
drop policy if exists team_presence_delete on public.team_presence;

create policy team_presence_select
on public.team_presence for select
to authenticated
using (auth.role()='authenticated');

create policy team_presence_insert
on public.team_presence for insert
to authenticated
with check (
  lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_presence_update
on public.team_presence for update
to authenticated
using (
  lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
)
with check (
  lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
);

create policy team_presence_delete
on public.team_presence for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
);

notify pgrst, 'reload schema';
