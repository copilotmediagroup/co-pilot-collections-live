-- CO PILOT COLLECTIONS MANAGER — R8N18 LIVE
-- RingCentral-connected Power Dialer Phase 1
-- Run this incremental file once in the LIVE Supabase SQL Editor.
-- Do NOT rerun the combined R8N17 reference migration.

create extension if not exists pgcrypto;

create or replace function public.cpcm_dialer_actor_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.cpcm_dialer_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.cpcm_dialer_actor_email() = 'afinch2678@gmail.com'
    or exists (
      select 1
      from public.app_users u
      where lower(u.email) = public.cpcm_dialer_actor_email()
        and lower(coalesce(u.role, '')) = 'admin'
        and coalesce(u.is_approved, true) = true
        and coalesce(u.is_active, true) = true
        and lower(coalesce(u.approval_status, 'approved')) = 'approved'
    );
$$;

grant execute on function public.cpcm_dialer_actor_email() to authenticated;
grant execute on function public.cpcm_dialer_is_admin() to authenticated;

create table if not exists public.ringcentral_user_mappings (
  id uuid primary key default gen_random_uuid(),
  employee_email text not null unique,
  ringcentral_extension_id text not null,
  ringcentral_extension_number text,
  ringcentral_forward_phone text not null,
  ringcentral_caller_id text,
  enabled boolean not null default true,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ringcentral_mapping_employee_email_lower check (employee_email = lower(employee_email))
);

create table if not exists public.dialer_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  filters jsonb not null default '{}'::jsonb,
  selected_employee_emails text[] not null default '{}'::text[],
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
  constraint dialer_campaign_status_check check (status in ('draft','scheduled','running','paused','stopped','completed')),
  constraint dialer_campaign_max_attempts_check check (max_attempts between 1 and 20)
);

create table if not exists public.dialer_campaign_accounts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dialer_campaigns(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  employee_email text not null,
  phone_number text,
  phone_slot text,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  last_result text,
  last_error text,
  compliance_snapshot jsonb not null default '{}'::jsonb,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dialer_campaign_account_unique unique (campaign_id, account_id),
  constraint dialer_campaign_account_status_check check (status in ('queued','dialing','ringing','connected','wrap_up','completed','skipped','blocked','failed'))
);

create table if not exists public.dialer_agent_status (
  employee_email text primary key,
  status text not null default 'unavailable',
  campaign_id uuid references public.dialer_campaigns(id) on delete set null,
  current_call_id uuid,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dialer_agent_email_lower check (employee_email = lower(employee_email)),
  constraint dialer_agent_status_check check (status in ('unavailable','available','dialing','connected','wrap_up'))
);

create table if not exists public.dialer_calls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dialer_campaigns(id) on delete cascade,
  campaign_account_id uuid not null references public.dialer_campaign_accounts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  employee_email text not null,
  phone_number text not null,
  ringcentral_extension_id text not null,
  provider_call_id text,
  telephony_session_id text,
  status text not null default 'initiated',
  provider_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  disposition_required boolean not null default true,
  disposition text,
  disposition_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dialer_call_status_check check (status in ('initiated','ringing','answered','disconnected','failed','completed'))
);

alter table public.dialer_agent_status
  drop constraint if exists dialer_agent_status_current_call_id_fkey;
alter table public.dialer_agent_status
  add constraint dialer_agent_status_current_call_id_fkey
  foreign key (current_call_id) references public.dialer_calls(id) on delete set null;

create table if not exists public.dialer_screen_pops (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.dialer_calls(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  employee_email text not null,
  status text not null default 'pending',
  event_payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dialer_screen_pop_status_check check (status in ('pending','delivered','acknowledged','expired'))
);

create table if not exists public.ringcentral_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_email text,
  ringcentral_subscription_id text unique,
  status text not null default 'pending',
  event_filters jsonb not null default '[]'::jsonb,
  webhook_address text,
  expires_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ringcentral_webhook_subscriptions
  add column if not exists employee_email text;

create index if not exists dialer_campaigns_status_idx on public.dialer_campaigns(status, created_at desc);
create index if not exists dialer_campaign_accounts_queue_idx on public.dialer_campaign_accounts(campaign_id, employee_email, status, sort_order);
create index if not exists dialer_calls_employee_status_idx on public.dialer_calls(employee_email, status, created_at desc);
create index if not exists dialer_calls_provider_idx on public.dialer_calls(provider_call_id);
create index if not exists dialer_calls_session_idx on public.dialer_calls(telephony_session_id);
create index if not exists dialer_screen_pops_employee_idx on public.dialer_screen_pops(employee_email, status, created_at);
create index if not exists ringcentral_mapping_extension_idx on public.ringcentral_user_mappings(ringcentral_extension_id);
create index if not exists ringcentral_webhook_employee_idx on public.ringcentral_webhook_subscriptions(employee_email, expires_at desc);

alter table public.ringcentral_user_mappings enable row level security;
alter table public.dialer_campaigns enable row level security;
alter table public.dialer_campaign_accounts enable row level security;
alter table public.dialer_agent_status enable row level security;
alter table public.dialer_calls enable row level security;
alter table public.dialer_screen_pops enable row level security;
alter table public.ringcentral_webhook_subscriptions enable row level security;

drop policy if exists cpcm_rc_mapping_select on public.ringcentral_user_mappings;
create policy cpcm_rc_mapping_select on public.ringcentral_user_mappings
for select to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_rc_mapping_admin_write on public.ringcentral_user_mappings;
create policy cpcm_rc_mapping_admin_write on public.ringcentral_user_mappings
for all to authenticated
using (public.cpcm_dialer_is_admin())
with check (public.cpcm_dialer_is_admin());

drop policy if exists cpcm_dialer_campaign_select on public.dialer_campaigns;
create policy cpcm_dialer_campaign_select on public.dialer_campaigns
for select to authenticated
using (
  public.cpcm_dialer_is_admin()
  or public.cpcm_dialer_actor_email() = any(selected_employee_emails)
);

drop policy if exists cpcm_dialer_campaign_admin_write on public.dialer_campaigns;
create policy cpcm_dialer_campaign_admin_write on public.dialer_campaigns
for all to authenticated
using (public.cpcm_dialer_is_admin())
with check (public.cpcm_dialer_is_admin());

drop policy if exists cpcm_dialer_campaign_accounts_select on public.dialer_campaign_accounts;
create policy cpcm_dialer_campaign_accounts_select on public.dialer_campaign_accounts
for select to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_campaign_accounts_admin_write on public.dialer_campaign_accounts;
create policy cpcm_dialer_campaign_accounts_admin_write on public.dialer_campaign_accounts
for all to authenticated
using (public.cpcm_dialer_is_admin())
with check (public.cpcm_dialer_is_admin());

drop policy if exists cpcm_dialer_agent_status_select on public.dialer_agent_status;
create policy cpcm_dialer_agent_status_select on public.dialer_agent_status
for select to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_agent_status_insert on public.dialer_agent_status;
create policy cpcm_dialer_agent_status_insert on public.dialer_agent_status
for insert to authenticated
with check (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_agent_status_update on public.dialer_agent_status;
create policy cpcm_dialer_agent_status_update on public.dialer_agent_status
for update to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email())
with check (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_calls_select on public.dialer_calls;
create policy cpcm_dialer_calls_select on public.dialer_calls
for select to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_calls_admin_write on public.dialer_calls;
create policy cpcm_dialer_calls_admin_write on public.dialer_calls
for all to authenticated
using (public.cpcm_dialer_is_admin())
with check (public.cpcm_dialer_is_admin());

drop policy if exists cpcm_dialer_screen_pops_select on public.dialer_screen_pops;
create policy cpcm_dialer_screen_pops_select on public.dialer_screen_pops
for select to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_dialer_screen_pops_update on public.dialer_screen_pops;
create policy cpcm_dialer_screen_pops_update on public.dialer_screen_pops
for update to authenticated
using (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email())
with check (public.cpcm_dialer_is_admin() or employee_email = public.cpcm_dialer_actor_email());

drop policy if exists cpcm_rc_webhook_admin_select on public.ringcentral_webhook_subscriptions;
create policy cpcm_rc_webhook_admin_select on public.ringcentral_webhook_subscriptions
for select to authenticated
using (public.cpcm_dialer_is_admin());

drop policy if exists cpcm_rc_webhook_admin_write on public.ringcentral_webhook_subscriptions;
create policy cpcm_rc_webhook_admin_write on public.ringcentral_webhook_subscriptions
for all to authenticated
using (public.cpcm_dialer_is_admin())
with check (public.cpcm_dialer_is_admin());

grant select, insert, update, delete on public.ringcentral_user_mappings to authenticated;
grant select, insert, update, delete on public.dialer_campaigns to authenticated;
grant select, insert, update, delete on public.dialer_campaign_accounts to authenticated;
grant select, insert, update on public.dialer_agent_status to authenticated;
grant select on public.dialer_calls to authenticated;
grant select, update on public.dialer_screen_pops to authenticated;
grant select, insert, update, delete on public.ringcentral_webhook_subscriptions to authenticated;

alter table public.dialer_calls replica identity full;
alter table public.dialer_screen_pops replica identity full;
alter table public.dialer_agent_status replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.dialer_calls;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.dialer_screen_pops;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.dialer_agent_status;
  exception when duplicate_object then null;
  end;
end $$;

-- R8N18 complete.
