
-- TEAM MESSENGER SQL
-- Run this in Supabase SQL Editor.
-- This adds internal messages only. Do NOT store full card, CVV, full ACH, or sensitive payment data.

create extension if not exists pgcrypto;

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  account_name text,
  account_number text,
  from_email text,
  to_email text,
  message_type text default 'General Message',
  priority text default 'Normal',
  subject text,
  body text,
  phone_number text,
  status text default 'Open',
  read_at timestamptz,
  closed_at timestamptz,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.team_messages
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists from_email text,
  add column if not exists to_email text,
  add column if not exists message_type text default 'General Message',
  add column if not exists priority text default 'Normal',
  add column if not exists subject text,
  add column if not exists body text,
  add column if not exists phone_number text,
  add column if not exists status text default 'Open',
  add column if not exists read_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_team_messages_to_email on public.team_messages(lower(coalesce(to_email,'')));
create index if not exists idx_team_messages_from_email on public.team_messages(lower(coalesce(from_email,'')));
create index if not exists idx_team_messages_status on public.team_messages(status);
create index if not exists idx_team_messages_account_id on public.team_messages(account_id);

alter table public.team_messages enable row level security;

drop policy if exists team_messages_select on public.team_messages;
drop policy if exists team_messages_insert on public.team_messages;
drop policy if exists team_messages_update on public.team_messages;
drop policy if exists team_messages_delete on public.team_messages;

create policy team_messages_select
on public.team_messages for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_messages_insert
on public.team_messages for insert
to authenticated
with check (
  auth.role() = 'authenticated'
);

create policy team_messages_update
on public.team_messages for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_messages_delete
on public.team_messages for delete
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
);

notify pgrst, 'reload schema';
