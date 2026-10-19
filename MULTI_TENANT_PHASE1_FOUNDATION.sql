-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 1
-- SAFE FOUNDATION ONLY. This file does NOT replace existing business-table RLS yet.
-- Goal: introduce organizations + memberships and tenant-stamp existing rows without breaking LIVE behavior.
-- Existing single-agency writes remain compatible via the temporary legacy organization default.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- 1) Tenant registry
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended','cancelled','demo')),
  plan text not null default 'founding',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deterministic tenant for all data that already belongs to Ready Collect Go.
insert into public.organizations (id,name,slug,status,plan,is_demo)
values ('00000000-0000-4000-8000-000000000001','Ready Collect Go','ready-collect-go','active','owner',false)
on conflict (id) do update set name=excluded.name, slug=excluded.slug, updated_at=now();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('agency_admin','admin','employee','collector','client','recruiter')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, auth_user_id)
);
create index if not exists idx_organization_members_user on public.organization_members(auth_user_id, is_active);
create index if not exists idx_organization_members_org on public.organization_members(organization_id, role, is_active);

-- Platform-owner identities are intentionally outside tenant data.
create table if not exists private.platform_admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
insert into private.platform_admins(auth_user_id)
select id from auth.users where lower(email)=lower('afinch2678@gmail.com')
on conflict do nothing;

-- 2) Authorization helpers. SECURITY DEFINER is limited to private schema and execute is revoked from PUBLIC.
create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.organization_members m
  where m.auth_user_id = (select auth.uid())
    and m.is_active = true
  order by m.created_at asc
  limit 1
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from private.platform_admins p
       where p.auth_user_id = (select auth.uid())
     )
$$;

create or replace function private.is_organization_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and (
       private.is_platform_admin()
       or exists (
         select 1
         from public.organization_members m
         where m.auth_user_id = (select auth.uid())
           and m.organization_id = target_org
           and m.is_active = true
           and m.role in ('agency_admin','admin')
       )
     )
$$;

revoke all on function private.current_organization_id() from public;
revoke all on function private.is_platform_admin() from public;
revoke all on function private.is_organization_admin(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;

-- 3) Seed current authenticated app users into the legacy tenant when possible.
do $$
begin
  if to_regclass('public.app_users') is not null
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='app_users' and column_name='user_id') then
    insert into public.organization_members(organization_id,auth_user_id,role,is_active)
    select
      '00000000-0000-4000-8000-000000000001'::uuid,
      u.user_id,
      case lower(coalesce(u.role,'employee'))
        when 'admin' then 'agency_admin'
        when 'client' then 'client'
        when 'recruiter' then 'recruiter'
        else 'employee'
      end,
      coalesce(u.is_active,true)
    from public.app_users u
    where u.user_id is not null
    on conflict (organization_id,auth_user_id) do update
      set role=excluded.role,is_active=excluded.is_active,updated_at=now();
  end if;
end $$;

-- 4) Add tenant ownership to all known agency-scoped tables.
-- The temporary default preserves current single-tenant inserts until Phase 2 updates the application.
do $$
declare
  t text;
  legacy constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  tenant_tables text[] := array[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments',
    'payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements',
    'audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events',
    'client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
    'nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events',
    'team_messages','team_typing_status','team_presence','ringcentral_call_records','employee_commission_earnings',
    'voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
    'voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa','ai_collector_script_profiles','account_communication_compliance',
    'ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id)',t);
      execute format('update public.%I set organization_id=$1 where organization_id is null',t) using legacy;
      execute format('alter table public.%I alter column organization_id set default %L::uuid',t,legacy::text);
      execute format('alter table public.%I alter column organization_id set not null',t);
      execute format('create index if not exists %I on public.%I(organization_id)', 'idx_'||t||'_organization', t);
    end if;
  end loop;
end $$;

-- 5) Ensure the app_users row itself is tenant-stamped even on installations where it was created after the membership seed.
-- Phase 2 will remove the legacy DEFAULT once all writes explicitly carry tenant context.

-- 6) Foundation-table RLS only. Business-table policy conversion is intentionally deferred to Phase 2.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
grant select on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;

-- Users can see their own tenant; platform admins can see all tenants.
drop policy if exists organizations_select_tenant on public.organizations;
create policy organizations_select_tenant
on public.organizations for select
to authenticated
using (
  private.is_platform_admin()
  or id = private.current_organization_id()
);

-- Users can see members of their tenant; platform admins can see all memberships.
drop policy if exists organization_members_select_tenant on public.organization_members;
create policy organization_members_select_tenant
on public.organization_members for select
to authenticated
using (
  private.is_platform_admin()
  or organization_id = private.current_organization_id()
);

comment on table public.organizations is 'Co Pilot SaaS tenant registry.';
comment on table public.organization_members is 'Authenticated user membership and role within a Co Pilot tenant.';

commit;

-- PHASE 1 VERIFICATION (read-only; run after applying in a NON-PRODUCTION test database first):
-- select id,name,slug,status,plan from public.organizations order by created_at;
-- select organization_id,role,count(*) from public.organization_members group by 1,2 order by 1,2;
-- select count(*) as accounts_without_tenant from public.accounts where organization_id is null;
-- select count(*) as users_without_tenant from public.app_users where organization_id is null;
-- Expected: both *_without_tenant counts = 0.
-- DO NOT replace existing business-table RLS until Agency A / Agency B deny-tests are ready.