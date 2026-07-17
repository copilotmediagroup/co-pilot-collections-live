
-- FACEBOOK STYLE TEAM CHAT SQL
-- Run this in the matching Supabase SQL Editor.
-- Internal chat only. Do not store full card/CVV/full ACH data.

create extension if not exists pgcrypto;

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  account_name text,
  account_number text,
  from_email text,
  to_email text,
  message_type text default 'Direct Message',
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
  add column if not exists message_type text default 'Direct Message',
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

create table if not exists public.team_typing_status (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  to_email text not null,
  is_typing boolean default false,
  updated_at timestamptz default now(),
  unique(user_email,to_email)
);

alter table public.team_typing_status
  add column if not exists user_email text,
  add column if not exists to_email text,
  add column if not exists is_typing boolean default false,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_team_typing_user_to on public.team_typing_status(lower(coalesce(user_email,'')),lower(coalesce(to_email,'')));
create index if not exists idx_team_messages_to_email on public.team_messages(lower(coalesce(to_email,'')));
create index if not exists idx_team_messages_from_email on public.team_messages(lower(coalesce(from_email,'')));
create index if not exists idx_team_messages_status on public.team_messages(status);
create index if not exists idx_team_messages_account_id on public.team_messages(account_id);

alter table public.team_messages enable row level security;
alter table public.team_typing_status enable row level security;

drop policy if exists team_messages_select on public.team_messages;
drop policy if exists team_messages_insert on public.team_messages;
drop policy if exists team_messages_update on public.team_messages;
drop policy if exists team_messages_delete on public.team_messages;
drop policy if exists team_typing_select on public.team_typing_status;
drop policy if exists team_typing_insert on public.team_typing_status;
drop policy if exists team_typing_update on public.team_typing_status;
drop policy if exists team_typing_delete on public.team_typing_status;

create policy team_messages_select
on public.team_messages for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_messages_insert
on public.team_messages for insert to authenticated
with check (auth.role() = 'authenticated');

create policy team_messages_update
on public.team_messages for update to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(from_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_messages_delete
on public.team_messages for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy team_typing_select
on public.team_typing_status for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_typing_insert
on public.team_typing_status for insert to authenticated
with check (auth.role() = 'authenticated');

create policy team_typing_update
on public.team_typing_status for update to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(user_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy team_typing_delete
on public.team_typing_status for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

notify pgrst, 'reload schema';
