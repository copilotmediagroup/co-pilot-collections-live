-- CO PILOT COLLECTIONS MANAGER — R8N19 LIVE
-- Simple TMax-style Voice Broadcast + RingCentral Group Transfer
-- Run this incremental file once in the LIVE Supabase SQL Editor.
-- Do NOT rerun the combined R8N17 reference migration.
-- This does not remove the prior R8N18 tables; the R8N19 frontend no longer uses them.

create extension if not exists pgcrypto;

create or replace function public.cpcm_broadcast_actor_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.cpcm_broadcast_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.cpcm_broadcast_actor_email() = 'afinch2678@gmail.com'
    or exists (
      select 1
      from public.app_users u
      where lower(u.email) = public.cpcm_broadcast_actor_email()
        and lower(coalesce(u.role, '')) = 'admin'
        and coalesce(u.is_approved, true) = true
        and coalesce(u.is_active, true) = true
        and lower(coalesce(u.approval_status, 'approved')) = 'approved'
    );
$$;

grant execute on function public.cpcm_broadcast_actor_email() to authenticated;
grant execute on function public.cpcm_broadcast_is_admin() to authenticated;

create table if not exists public.voice_broadcast_settings (
  id text primary key default 'default',
  transfer_number text,
  connect_mode text not null default 'press_1',
  live_message_text text not null default 'Please hold while we connect your call. Press 1 to speak with a representative.',
  voicemail_message_text text not null default 'Please contact our office regarding an important business matter.',
  leave_voicemail boolean not null default false,
  calls_per_minute integer not null default 6,
  max_concurrent integer not null default 1,
  max_attempts integer not null default 2,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_broadcast_settings_singleton check (id = 'default'),
  constraint voice_broadcast_connect_mode_check check (connect_mode in ('press_1','auto_transfer')),
  constraint voice_broadcast_settings_rate_check check (calls_per_minute between 1 and 60),
  constraint voice_broadcast_settings_concurrent_check check (max_concurrent between 1 and 10),
  constraint voice_broadcast_settings_attempts_check check (max_attempts between 1 and 10)
);

insert into public.voice_broadcast_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.voice_broadcast_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  filters jsonb not null default '{}'::jsonb,
  transfer_number text not null,
  connect_mode text not null default 'press_1',
  live_message_text text not null,
  voicemail_message_text text,
  leave_voicemail boolean not null default false,
  compliance_confirmed boolean not null default false,
  calls_per_minute integer not null default 6,
  max_concurrent integer not null default 1,
  max_attempts integer not null default 2,
  schedule_start timestamptz,
  schedule_end timestamptz,
  created_by_email text not null,
  started_at timestamptz,
  paused_at timestamptz,
  stopped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_broadcast_campaign_status_check check (status in ('draft','scheduled','running','paused','stopped','completed')),
  constraint voice_broadcast_campaign_mode_check check (connect_mode in ('press_1','auto_transfer')),
  constraint voice_broadcast_campaign_rate_check check (calls_per_minute between 1 and 60),
  constraint voice_broadcast_campaign_concurrent_check check (max_concurrent between 1 and 10),
  constraint voice_broadcast_campaign_attempts_check check (max_attempts between 1 and 10)
);

create table if not exists public.voice_broadcast_campaign_accounts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.voice_broadcast_campaigns(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  phone_number text,
  phone_slot text,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  sort_order bigint not null default 0,
  last_attempt_at timestamptz,
  last_result text,
  last_error text,
  compliance_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_broadcast_campaign_account_unique unique (campaign_id, account_id),
  constraint voice_broadcast_campaign_account_status_check check (status in (
    'queued','initiating','ringing','human','machine','pressed_1','transferring','connected',
    'completed','retry','blocked','no_answer','busy','failed','canceled'
  ))
);

create table if not exists public.voice_broadcast_calls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.voice_broadcast_campaigns(id) on delete cascade,
  campaign_account_id uuid not null references public.voice_broadcast_campaign_accounts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  phone_number text not null,
  provider_call_sid text unique,
  provider_parent_call_sid text,
  status text not null default 'initiated',
  answered_by text,
  digits text,
  transfer_status text,
  duration_seconds integer not null default 0,
  result text,
  provider_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  transferred_at timestamptz,
  ended_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_broadcast_call_status_check check (status in (
    'initiated','ringing','answered','human','machine','gathering','pressed_1',
    'transferring','connected','completed','no_answer','busy','failed','canceled'
  ))
);

create index if not exists voice_broadcast_campaigns_status_idx
  on public.voice_broadcast_campaigns(status, created_at desc);
create index if not exists voice_broadcast_queue_idx
  on public.voice_broadcast_campaign_accounts(campaign_id, status, sort_order);
create index if not exists voice_broadcast_calls_campaign_idx
  on public.voice_broadcast_calls(campaign_id, status, created_at desc);
create index if not exists voice_broadcast_calls_account_idx
  on public.voice_broadcast_calls(account_id, created_at desc);
create index if not exists voice_broadcast_calls_provider_idx
  on public.voice_broadcast_calls(provider_call_sid);

alter table public.voice_broadcast_settings enable row level security;
alter table public.voice_broadcast_campaigns enable row level security;
alter table public.voice_broadcast_campaign_accounts enable row level security;
alter table public.voice_broadcast_calls enable row level security;

drop policy if exists cpcm_voice_broadcast_settings_admin on public.voice_broadcast_settings;
create policy cpcm_voice_broadcast_settings_admin on public.voice_broadcast_settings
for all to authenticated
using (public.cpcm_broadcast_is_admin())
with check (public.cpcm_broadcast_is_admin());

drop policy if exists cpcm_voice_broadcast_campaigns_admin on public.voice_broadcast_campaigns;
create policy cpcm_voice_broadcast_campaigns_admin on public.voice_broadcast_campaigns
for all to authenticated
using (public.cpcm_broadcast_is_admin())
with check (public.cpcm_broadcast_is_admin());

drop policy if exists cpcm_voice_broadcast_accounts_admin on public.voice_broadcast_campaign_accounts;
create policy cpcm_voice_broadcast_accounts_admin on public.voice_broadcast_campaign_accounts
for all to authenticated
using (public.cpcm_broadcast_is_admin())
with check (public.cpcm_broadcast_is_admin());

drop policy if exists cpcm_voice_broadcast_calls_admin on public.voice_broadcast_calls;
create policy cpcm_voice_broadcast_calls_admin on public.voice_broadcast_calls
for all to authenticated
using (public.cpcm_broadcast_is_admin())
with check (public.cpcm_broadcast_is_admin());

grant select, insert, update, delete on public.voice_broadcast_settings to authenticated;
grant select, insert, update, delete on public.voice_broadcast_campaigns to authenticated;
grant select, insert, update, delete on public.voice_broadcast_campaign_accounts to authenticated;
grant select, insert, update, delete on public.voice_broadcast_calls to authenticated;

-- Add tables to Supabase Realtime when the publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.voice_broadcast_campaigns; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.voice_broadcast_campaign_accounts; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.voice_broadcast_calls; exception when duplicate_object then null; end;
  end if;
end $$;
