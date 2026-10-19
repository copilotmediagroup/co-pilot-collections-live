
-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE1_FOUNDATION.sql
-- ============================================================================
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
-- SaaS v1 deliberately supports one active agency membership per login. This makes tenant resolution deterministic.
create unique index if not exists organization_members_one_active_org_per_user
  on public.organization_members(auth_user_id) where is_active=true;
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
-- END MULTI_TENANT_PHASE1_FOUNDATION.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE3_TENANT_KEYS_AND_TEST_HARNESS.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 3
-- NON-PRODUCTION TEST GATE. Run only after Phase 1 and before enabling Phase 2 fences.
-- Converts known single-company uniqueness rules to tenant-aware uniqueness where the legacy schema allows it.

begin;

-- role_permissions: same role/permission may exist independently in every agency.
do $$
declare c record;
begin
  if to_regclass('public.role_permissions') is not null then
    for c in
      select conname from pg_constraint
      where conrelid='public.role_permissions'::regclass and contype='u'
        and pg_get_constraintdef(oid) ilike '%role%permission_key%'
    loop execute format('alter table public.role_permissions drop constraint %I',c.conname); end loop;
    create unique index if not exists uq_role_permissions_org_role_key
      on public.role_permissions(organization_id,role,permission_key);
  end if;
end $$;

-- client portal assignments: the same client/portfolio pair may exist in different agencies.
do $$
declare c record;
begin
  if to_regclass('public.client_portfolio_assignments') is not null then
    for c in
      select conname from pg_constraint
      where conrelid='public.client_portfolio_assignments'::regclass and contype='u'
        and pg_get_constraintdef(oid) ilike '%client_email%portfolio_name%'
    loop execute format('alter table public.client_portfolio_assignments drop constraint %I',c.conname); end loop;
    create unique index if not exists uq_client_portfolio_assignments_org_client_portfolio
      on public.client_portfolio_assignments(organization_id,client_email,portfolio_name);
  end if;
end $$;

-- client fee schedule: the same client/portfolio names are valid in different agencies.
do $$
declare c record;
begin
  if to_regclass('public.client_fee_schedules') is not null then
    for c in
      select conname from pg_constraint
      where conrelid='public.client_fee_schedules'::regclass and contype='u'
        and pg_get_constraintdef(oid) ilike '%client_email%portfolio_name%'
    loop execute format('alter table public.client_fee_schedules drop constraint %I',c.conname); end loop;
    create unique index if not exists uq_client_fee_schedules_org_client_portfolio
      on public.client_fee_schedules(organization_id,client_email,portfolio_name);
  end if;
end $$;

-- AI script profile names are tenant-owned configuration.
do $$
declare c record;
begin
  if to_regclass('public.ai_collector_script_profiles') is not null then
    for c in
      select conname from pg_constraint
      where conrelid='public.ai_collector_script_profiles'::regclass and contype='u'
        and pg_get_constraintdef(oid) ilike '%profile_name%'
    loop execute format('alter table public.ai_collector_script_profiles drop constraint %I',c.conname); end loop;
    create unique index if not exists uq_ai_script_profiles_org_name
      on public.ai_collector_script_profiles(organization_id,profile_name);
  end if;
end $$;

-- company_settings and singleton config tables use legacy primary keys that cannot represent
-- one row per tenant. Do not mutate these automatically until application reads/writes are switched
-- to organization-qualified lookups. Record the required Phase 4 conversions explicitly:
-- company_settings: PK(setting_key) -> PK/UNIQUE(organization_id,setting_key)
-- voice_broadcast_settings: PK(id='default') -> PK/UNIQUE(organization_id,id)
-- ai_call_runtime_config: PK(boolean id=true) -> PK/UNIQUE(organization_id,id)
-- ai_caller_id_config: PK(boolean id=true) -> PK/UNIQUE(organization_id,id)
-- ai_bland_pathway_config: PK(boolean id=true) -> PK/UNIQUE(organization_id,id)
-- account_communication_compliance: account_id PK is safe because account UUID is globally unique.

commit;

-- TEST HARNESS SETUP (run in a disposable/staging Supabase project):
-- 1. Create two auth users in Auth: agency-a-test@... and agency-b-test@...
-- 2. Capture their auth.users UUIDs as :agency_a_user and :agency_b_user.
-- 3. Seed tenants/memberships below, replacing placeholders.
--
-- insert into public.organizations(id,name,slug,status,plan,is_demo) values
-- ('10000000-0000-4000-8000-000000000001','Agency A Test','agency-a-test','demo','test',true),
-- ('20000000-0000-4000-8000-000000000002','Agency B Test','agency-b-test','demo','test',true)
-- on conflict(id) do nothing;
--
-- insert into public.organization_members(organization_id,auth_user_id,role,is_active) values
-- ('10000000-0000-4000-8000-000000000001',:agency_a_user,'agency_admin',true),
-- ('20000000-0000-4000-8000-000000000002',:agency_b_user,'agency_admin',true)
-- on conflict(organization_id,auth_user_id) do update set is_active=true,role='agency_admin';
--
-- After Phase 2 is enabled, authenticate through the normal client as each user and run REST tests.
-- PASS CONDITIONS:
-- A SELECT B row => zero rows.
-- A UPDATE/DELETE B row => zero affected rows / denied.
-- A INSERT specifying B organization_id => stored as A (trigger) or denied by RLS.
-- Repeat for accounts, payments_ledger, payment_plans, team_messages, account_docs.
-- Existing collector/client restrictions inside A must still deny records they were already forbidden to access.

-- END MULTI_TENANT_PHASE3_TENANT_KEYS_AND_TEST_HARNESS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE4_SINGLETON_CONFIG_KEYS.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 4
-- NON-PRODUCTION FIRST. Converts legacy single-company configuration keys into tenant-qualified keys.
-- Prerequisite: Phase 1 has added organization_id and backfilled existing rows.

begin;

-- company_settings: legacy PK(setting_key) becomes UNIQUE(organization_id, setting_key).
do $$ declare c record; begin
 if to_regclass('public.company_settings') is not null then
  for c in select conname from pg_constraint where conrelid='public.company_settings'::regclass and contype='p'
  loop execute format('alter table public.company_settings drop constraint %I',c.conname); end loop;
  alter table public.company_settings add column if not exists id uuid default gen_random_uuid();
  update public.company_settings set id=gen_random_uuid() where id is null;
  alter table public.company_settings alter column id set not null;
  alter table public.company_settings add constraint company_settings_pkey primary key(id);
  create unique index if not exists uq_company_settings_org_key on public.company_settings(organization_id,setting_key);
 end if;
end $$;

-- voice broadcast settings: preserve id='default' semantics within each organization.
do $$ declare c record; begin
 if to_regclass('public.voice_broadcast_settings') is not null then
  for c in select conname from pg_constraint where conrelid='public.voice_broadcast_settings'::regclass and contype='p'
  loop execute format('alter table public.voice_broadcast_settings drop constraint %I',c.conname); end loop;
  create unique index if not exists uq_voice_broadcast_settings_org_id on public.voice_broadcast_settings(organization_id,id);
 end if;
end $$;

-- Boolean singleton AI configs: id=true remains valid once qualified by organization.
do $$ declare t text; c record; begin
 foreach t in array array['ai_call_runtime_config','ai_caller_id_config','ai_bland_pathway_config'] loop
  if to_regclass('public.'||t) is not null then
   for c in select conname from pg_constraint where conrelid=to_regclass('public.'||t) and contype='p'
   loop execute format('alter table public.%I drop constraint %I',t,c.conname); end loop;
   execute format('create unique index if not exists %I on public.%I(organization_id,id)','uq_'||t||'_org_id',t);
  end if;
 end loop;
end $$;

commit;

-- PostgREST upserts must now use tenant-qualified conflict targets:
-- company_settings: on_conflict=organization_id,setting_key
-- voice_broadcast_settings: on_conflict=organization_id,id
-- AI singleton configs should be selected/updated under tenant RLS; service-role edge functions MUST explicitly filter organization_id.

-- END MULTI_TENANT_PHASE4_SINGLETON_CONFIG_KEYS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE5_RPC_TENANT_BINDING.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 5
-- Tenant-binding hardening for privileged AI RPCs. NON-PRODUCTION FIRST.
-- Provider-facing Edge Functions must resolve organization_id from the stored attempt.

begin;

-- Replace the identity-verification RPC with an explicit tenant-bound signature.
drop function if exists public.cpcm_record_ai_identity_verification(uuid,boolean,text);
create or replace function public.cpcm_record_ai_identity_verification(
 p_attempt_id uuid,p_organization_id uuid,p_verified boolean,p_method text default 'mailing_zip_code')
returns table(verified boolean,failed_attempts integer,locked boolean)
language plpgsql security definer set search_path=public as $$
declare v public.ai_real_call_attempts%rowtype; next_failures integer;
begin
 if p_organization_id is null then raise exception 'organization required'; end if;
 select * into v from public.ai_real_call_attempts where id=p_attempt_id and organization_id=p_organization_id for update;
 if not found then raise exception 'attempt not found'; end if;
 if v.identity_verification_locked_at is not null then return query select false,v.identity_verification_failed_attempts,true; return; end if;
 if v.identity_verified_at is not null then return query select true,v.identity_verification_failed_attempts,false; return; end if;
 if p_verified then
  update public.ai_real_call_attempts set identity_verified_at=now(),identity_verification_method=left(coalesce(p_method,'mailing_zip_code'),100),updated_at=now()
   where id=p_attempt_id and organization_id=p_organization_id;
  return query select true,v.identity_verification_failed_attempts,false; return;
 end if;
 next_failures:=v.identity_verification_failed_attempts+1;
 update public.ai_real_call_attempts set identity_verification_failed_attempts=next_failures,
  identity_verification_locked_at=case when next_failures>=2 then now() else null end,updated_at=now()
  where id=p_attempt_id and organization_id=p_organization_id;
 return query select false,next_failures,(next_failures>=2);
end $$;
revoke all on function public.cpcm_record_ai_identity_verification(uuid,uuid,boolean,text) from public,anon,authenticated;

commit;

-- END MULTI_TENANT_PHASE5_RPC_TENANT_BINDING.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE6_RINGCENTRAL_TENANT_OWNERSHIP.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 6
-- NON-PRODUCTION FIRST. RingCentral mappings/call records must carry tenant ownership.
begin;

-- ringcentral_call_records is already covered by Phase 1, but its legacy primary key can collide
-- if multiple agencies use the same provider/session identifiers. Preserve a surrogate key and
-- tenant-qualified provider id uniqueness.
do $$ declare c record; begin
 if to_regclass('public.ringcentral_call_records') is not null then
  for c in select conname from pg_constraint where conrelid='public.ringcentral_call_records'::regclass and contype='p'
  loop execute format('alter table public.ringcentral_call_records drop constraint %I',c.conname); end loop;
  alter table public.ringcentral_call_records add column if not exists id uuid default gen_random_uuid();
  update public.ringcentral_call_records set id=gen_random_uuid() where id is null;
  alter table public.ringcentral_call_records alter column id set not null;
  alter table public.ringcentral_call_records add constraint ringcentral_call_records_pkey primary key(id);
  create unique index if not exists uq_ringcentral_call_records_org_rc on public.ringcentral_call_records(organization_id,rc_call_id);
 end if;
end $$;

-- This table exists in LIVE even though its original CREATE migration is absent from the repo snapshot.
-- Add ownership defensively and backfill legacy mappings to the legacy tenant.
do $$ begin
 if to_regclass('public.ringcentral_user_mappings') is not null then
  alter table public.ringcentral_user_mappings add column if not exists organization_id uuid references public.organizations(id);
  update public.ringcentral_user_mappings set organization_id='00000000-0000-4000-8000-000000000001'::uuid where organization_id is null;
  alter table public.ringcentral_user_mappings alter column organization_id set not null;
  create index if not exists idx_ringcentral_user_mappings_org on public.ringcentral_user_mappings(organization_id);
 end if;
end $$;
commit;

-- END MULTI_TENANT_PHASE6_RINGCENTRAL_TENANT_OWNERSHIP.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE9_RPC_GUARDRAILS.sql
-- ============================================================================
-- Co Pilot Collections — Phase 9: RPC tenant guardrails
-- NON-PRODUCTION FIRST. RLS remains the primary boundary; these guards make tenant intent explicit.
begin;

create or replace function private.assert_account_in_current_organization(p_account_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_org uuid; v_current uuid;
begin
 if private.is_platform_admin() then
  select organization_id into v_org from public.accounts where id=p_account_id;
  if v_org is null then raise exception 'Account not found'; end if;
  return v_org;
 end if;
 v_current:=private.current_organization_id();
 if v_current is null then raise exception 'Active organization membership required' using errcode='42501'; end if;
 select organization_id into v_org from public.accounts where id=p_account_id and organization_id=v_current;
 if v_org is null then raise exception 'Account not found in current organization' using errcode='42501'; end if;
 return v_org;
end $$;
revoke all on function private.assert_account_in_current_organization(uuid) from public;
grant execute on function private.assert_account_in_current_organization(uuid) to authenticated;

-- Tenant-safe phone lookup. SECURITY INVOKER means existing account RLS still applies.
create or replace function public.cpcm_accounts_by_phone(p_phone text)
returns table(id uuid,full_name text,account_number text,current_balance numeric,original_creditor text,portfolio text,status text)
language sql stable security invoker set search_path=public as $$
 select a.id,a.full_name,a.account_number,a.current_balance,a.original_creditor,a.portfolio,a.status
 from public.accounts a
 where (private.is_platform_admin() or a.organization_id=private.current_organization_id())
 and length(regexp_replace(coalesce(p_phone,''),'\D','','g'))>=10
 and right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10) in (
  right(regexp_replace(coalesce(a.phone1,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone2,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone3,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone4,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone5,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone6,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone7,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone8,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone9,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone10,''),'\D','','g'),10))
 limit 20;
$$;
revoke all on function public.cpcm_accounts_by_phone(text) from public,anon;
grant execute on function public.cpcm_accounts_by_phone(text) to authenticated;

commit;

-- REQUIRED RPC AUDIT RULE:
-- Every authenticated RPC that accepts an account id must either be SECURITY INVOKER over tenant-fenced tables
-- or call private.assert_account_in_current_organization(target_account_id) before mutation.
-- Every SECURITY DEFINER RPC must derive tenant from auth.uid()/organization_members or a trusted stored record;
-- never accept organization_id from the browser as authority.

-- END MULTI_TENANT_PHASE9_RPC_GUARDRAILS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE10_CLIENT_PORTAL_RPCS.sql
-- ============================================================================
-- Phase 10 tenant-safe client portal RPC overrides. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'role',u.role,'approval_status',u.approval_status,
      'is_approved',u.is_approved,'is_active',u.is_active,'client_contact_name',u.client_contact_name,
      'client_company_name',u.client_company_name,'client_portal_enabled',u.client_portal_enabled,'client_can_view_accounts',u.client_can_view_accounts,'client_can_view_payments',u.client_can_view_payments,'client_can_download_reports',u.client_can_download_reports
    ) order by lower(u.email)) from public.app_users u where u.organization_id=oid and lower(u.email)<>actor),'[]'::jsonb),
    'portfolios',coalesce((select jsonb_agg(x.portfolio order by lower(x.portfolio)) from (select distinct trim(a.portfolio) portfolio from public.accounts a where a.organization_id=oid and nullif(trim(a.portfolio),'') is not null) x),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('client_email',lower(c.client_email),'portfolio_name',c.portfolio_name,'assigned_by_email',c.assigned_by_email,'updated_at',c.updated_at) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c where c.organization_id=oid),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_client_portal_access(target_email text, contact_name text, company_name text, approved boolean, portfolio_names text[], can_view_accounts boolean, can_view_payments boolean, can_download_reports boolean)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,''))); p text;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  update public.app_users set role='client',full_name=coalesce(nullif(trim(contact_name),''),full_name),client_contact_name=nullif(trim(contact_name),''),client_company_name=nullif(trim(company_name),''),client_portal_enabled=approved,client_can_view_accounts=coalesce(can_view_accounts,true),client_can_view_payments=coalesce(can_view_payments,true),client_can_download_reports=coalesce(can_download_reports,true),approval_status=case when approved then 'approved' else 'pending' end,is_approved=approved,is_active=approved,updated_at=now() where organization_id=oid and lower(email)=target;
  if not found then
    insert into public.app_users(organization_id,email,role,full_name,client_contact_name,client_company_name,client_portal_enabled,client_can_view_accounts,client_can_view_payments,client_can_download_reports,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values(oid,target,'client',nullif(trim(contact_name),''),nullif(trim(contact_name),''),nullif(trim(company_name),''),approved,coalesce(can_view_accounts,true),coalesce(can_view_payments,true),coalesce(can_download_reports,true),case when approved then 'approved' else 'pending' end,approved,approved,now(),now(),now());
  end if;
  delete from public.client_portfolio_assignments where organization_id=oid and lower(client_email)=target;
  foreach p in array coalesce(portfolio_names,array[]::text[]) loop
    if nullif(trim(p),'') is not null then insert into public.client_portfolio_assignments(organization_id,client_email,portfolio_name,assigned_by_email,updated_at) values(oid,target,trim(p),actor,now()) on conflict(organization_id,client_email,portfolio_name) do update set assigned_by_email=excluded.assigned_by_email,updated_at=now(); end if;
  end loop;
  return jsonb_build_object('ok',true,'email',target,'approved',approved,'portfolio_count',coalesce(array_length(portfolio_names,1),0));
end $$;

create or replace function public.cpcm_admin_disable_client_portal_access(target_email text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,'')));
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  update public.app_users set client_portal_enabled=false,approval_status='pending',is_approved=false,is_active=false,updated_at=now() where organization_id=oid and lower(email)=target and lower(role)='client';
  return jsonb_build_object('ok',true,'email',target);
end $$;

create or replace function public.cpcm_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); profile_row public.app_users%rowtype; result jsonb;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where organization_id=oid and lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false) or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then raise exception 'client portal access is not approved'; end if;

  with allowed as (
    select distinct lower(trim(portfolio_name)) portfolio_key,trim(portfolio_name) portfolio_name from public.client_portfolio_assignments where organization_id=oid and lower(client_email)=actor
  ), acc as (
    select a.* from public.accounts a join allowed x on lower(trim(coalesce(a.portfolio,'')))=x.portfolio_key where a.organization_id=oid
  ), pay as (
    select l.account_id,sum(case when lower(coalesce(l.status,''))='completed' and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') then coalesce(l.amount,0) else 0 end) collected,max(l.payment_date) last_payment_date
    from public.payments_ledger l join acc a on a.id=l.account_id group by l.account_id
  ), plan as (
    select distinct on (p.account_id) p.account_id,p.status,p.remaining_amount,p.total_amount from public.payment_plans p join acc a on a.id=p.account_id order by p.account_id,p.created_at desc
  ), port as (
    select a.portfolio portfolio_name,count(*) account_count,sum(coalesce(a.original_balance,a.current_balance,0)) total_placed,sum(coalesce(a.current_balance,0)) current_balance,sum(coalesce(pay.collected,0)) collected
    from acc a left join pay on pay.account_id=a.id group by a.portfolio
  ), stats as (
    select count(*) account_count,sum(coalesce(a.original_balance,a.current_balance,0)) total_placed,sum(coalesce(a.current_balance,0)) current_balance,sum(coalesce(pay.collected,0)) total_collected,
      count(*) filter(where coalesce(a.current_balance,0)<=0 or lower(coalesce(a.status,'')) in ('settled','paid','paid in full','pif','closed')) paid_accounts,
      count(*) filter(where lower(coalesce(plan.status,''))='active') active_plans
    from acc a left join pay on pay.account_id=a.id left join plan on plan.account_id=a.id
  ), settlement_stats as (
    select count(*) filter(where lower(coalesce(s.status,'')) in ('approved','paid','settled','completed')) approved_settlements,
      sum(case when lower(coalesce(s.status,'')) in ('approved','paid','settled','completed') then coalesce(s.settlement_amount,0) else 0 end) approved_settlement_amount
    from public.settlements s join acc a on a.id=s.account_id
  ), promise_stats as (
    select count(*) filter(where lower(coalesce(p.status,'')) like '%broken%' or lower(coalesce(p.status,'')) like '%missed%') broken_promises from public.payment_promises p join acc a on a.id=p.account_id
  ), plan_perf as (
    select count(*) filter(where lower(coalesce(pp.status,''))='paid') paid_count,count(*) filter(where lower(coalesce(pp.status,'')) not in ('cancelled','void')) total_count from public.payment_plan_payments pp join acc a on a.id=pp.account_id
  )
  select jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'full_name',profile_row.full_name,'contact_name',profile_row.client_contact_name,'company_name',profile_row.client_company_name,'can_view_accounts',profile_row.client_can_view_accounts,'can_view_payments',profile_row.client_can_view_payments,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object('account_count',coalesce(st.account_count,0),'total_placed',coalesce(st.total_placed,0),'current_balance',coalesce(st.current_balance,0),'total_collected',coalesce(st.total_collected,0),'liquidation_rate',case when coalesce(st.total_placed,0)>0 then st.total_collected/st.total_placed*100 else 0 end,'paid_accounts',coalesce(st.paid_accounts,0),'active_plans',coalesce(st.active_plans,0),'approved_settlements',coalesce(ss.approved_settlements,0),'approved_settlement_amount',coalesce(ss.approved_settlement_amount,0),'broken_promises',coalesce(ps.broken_promises,0),'plan_performance',case when coalesce(pp.total_count,0)>0 then pp.paid_count::numeric/pp.total_count*100 else 0 end),
    'portfolios',coalesce((select jsonb_agg(to_jsonb(port) order by lower(portfolio_name)) from port),'[]'::jsonb),
    'accounts',case when coalesce(profile_row.client_can_view_accounts,true) then coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'consumer_name',coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name))),'account_number',coalesce(a.account_number,a.client_account_number,a.source_account_id),'portfolio',a.portfolio,'original_creditor',a.original_creditor,'original_balance',coalesce(a.original_balance,a.current_balance,0),'current_balance',coalesce(a.current_balance,0),'status',a.status,'collected',coalesce(pay.collected,0),'last_payment_date',pay.last_payment_date,'plan_status',plan.status) order by lower(coalesce(a.portfolio,'')),lower(coalesce(a.full_name,a.last_name,''))) from acc a left join pay on pay.account_id=a.id left join plan on plan.account_id=a.id),'[]'::jsonb) else '[]'::jsonb end,
    'recent_payments',case when coalesce(profile_row.client_can_view_payments,true) then coalesce((select jsonb_agg(x.j order by x.payment_date desc) from (select l.payment_date,jsonb_build_object('payment_date',l.payment_date,'consumer_name',coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name))),'portfolio',a.portfolio,'amount',l.amount,'payment_method',l.payment_method,'receipt_number',l.receipt_number) j from public.payments_ledger l join acc a on a.id=l.account_id where lower(coalesce(l.status,''))='completed' and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') order by l.payment_date desc,l.created_at desc limit 25) x),'[]'::jsonb) else '[]'::jsonb end
  ) into result from stats st cross join settlement_stats ss cross join promise_stats ps cross join plan_perf pp;
  return result;
end $$;

grant select on public.client_portfolio_assignments to authenticated;
grant execute on function public.cpcm_admin_client_portal_snapshot() to authenticated;
grant execute on function public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) to authenticated;
grant execute on function public.cpcm_admin_disable_client_portal_access(text) to authenticated;
grant execute on function public.cpcm_client_portal_snapshot() to authenticated;

notify pgrst,'reload schema';


-- R6 STAFF APPROVAL ACTIONS FIX (also provided as a separate incremental SQL file)

-- END MULTI_TENANT_PHASE10_CLIENT_PORTAL_RPCS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE11_STAFF_ADMIN_RPC.sql
-- ============================================================================
-- Phase 11: tenant-safe staff administration override. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_manage_staff_user(
  target_email text,
  requested_action text,
  removal_reason_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  oid uuid:=private.current_organization_id();
  target text:=lower(trim(coalesce(target_email,'')));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  target_role text;
  released_count integer:=0;
  result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  if target=actor then raise exception 'protected admin account cannot be changed'; end if;

  select lower(coalesce(role,'employee')) into target_role
  from public.app_users where organization_id=oid and lower(email)=target limit 1;
  if not found then raise exception 'user not found'; end if;

  if action_name='approved' then
    update public.app_users set
      approval_status='approved',is_approved=true,is_active=true,
      client_portal_enabled=case when target_role='client' then true else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='pending' then
    update public.app_users set
      approval_status='pending',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='rejected' then
    update public.app_users set
      approval_status='rejected',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='activate' then
    update public.app_users set
      is_active=true,
      client_portal_enabled=case when target_role='client' and coalesce(is_approved,false) then true else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='deactivate' then
    update public.app_users set
      is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='remove' then
    update public.app_users set
      approval_status='removed',is_approved=false,is_active=false,client_portal_enabled=false,
      removed_at=now(),removed_by_email=actor,removal_reason=coalesce(nullif(trim(removal_reason_text),''),'Fired / removed'),updated_at=now()
    where organization_id=oid and lower(email)=target;

    update public.accounts set
      assigned_to_email=null,assigned_by_email=actor,assigned_at=null,
      assignment_method='employee_removed',assignment_group_id=null,updated_at=now()
    where organization_id=oid and lower(coalesce(assigned_to_email,''))=target;
    get diagnostics released_count=row_count;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select jsonb_build_object(
    'ok',true,'email',email,'role',role,'approval_status',approval_status,
    'is_approved',is_approved,'is_active',is_active,
    'client_portal_enabled',client_portal_enabled,
    'assigned_accounts_released',released_count
  ) into result from public.app_users where organization_id=oid and lower(email)=target limit 1;
  return result;
end;
$$;

revoke all on function public.cpcm_admin_manage_staff_user(text,text,text) from public;
grant execute on function public.cpcm_admin_manage_staff_user(text,text,text) to authenticated;
notify pgrst,'reload schema';

-- END MULTI_TENANT_PHASE11_STAFF_ADMIN_RPC.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE12_REMITTANCE_RPCS.sql
-- ============================================================================
-- Phase 12: tenant-safe remittance/fee RPC overrides. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select jsonb_build_object(
    'clients',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'contact_name',u.client_contact_name,
      'company_name',u.client_company_name,'enabled',u.client_portal_enabled,
      'approved',u.is_approved,'active',u.is_active
    ) order by lower(coalesce(u.client_company_name,u.full_name,u.email)))
      from public.app_users u where u.organization_id=oid and lower(coalesce(u.role,''))='client'),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'client_email',lower(c.client_email),'portfolio_name',c.portfolio_name
    ) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c where c.organization_id=oid),'[]'::jsonb),
    'fee_schedules',coalesce((select jsonb_agg(to_jsonb(f) order by lower(f.client_email),lower(f.portfolio_name)) from public.client_fee_schedules f where f.organization_id=oid),'[]'::jsonb),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (
      select * from public.client_remittance_batches where organization_id=oid order by created_at desc limit 500
    ) b),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_fee_schedule(
  target_client_email text,
  target_portfolio_name text,
  new_agency_fee_percent numeric,
  new_processor_fee_percent numeric,
  new_processor_fee_fixed numeric,
  new_processor_fee_payer text,
  new_remittance_frequency text,
  new_payment_terms_days integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  payer text:=lower(trim(coalesce(new_processor_fee_payer,'client')));
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if coalesce(new_agency_fee_percent,0)<0 or coalesce(new_agency_fee_percent,0)>100 then raise exception 'agency fee must be between 0 and 100'; end if;
  if coalesce(new_processor_fee_percent,0)<0 or coalesce(new_processor_fee_percent,0)>100 then raise exception 'processor fee percent must be between 0 and 100'; end if;
  if payer not in ('client','agency') then raise exception 'processor fee payer must be client or agency'; end if;

  insert into public.client_fee_schedules(
    organization_id,client_email,portfolio_name,agency_fee_percent,processor_fee_percent,processor_fee_fixed,
    processor_fee_payer,remittance_frequency,payment_terms_days,is_active,created_by_email,updated_at
  ) values(
    oid,target,portfolio,round(coalesce(new_agency_fee_percent,0),4),round(coalesce(new_processor_fee_percent,0),4),
    round(coalesce(new_processor_fee_fixed,0),2),payer,coalesce(nullif(trim(new_remittance_frequency),''),'Monthly'),
    greatest(0,least(365,coalesce(new_payment_terms_days,10))),true,actor,now()
  )
  on conflict(organization_id,client_email,portfolio_name) do update set
    agency_fee_percent=excluded.agency_fee_percent,
    processor_fee_percent=excluded.processor_fee_percent,
    processor_fee_fixed=excluded.processor_fee_fixed,
    processor_fee_payer=excluded.processor_fee_payer,
    remittance_frequency=excluded.remittance_frequency,
    payment_terms_days=excluded.payment_terms_days,
    is_active=true,
    updated_at=now();

  return jsonb_build_object('ok',true,'client_email',target,'portfolio_name',portfolio);
end $$;

create or replace function public.cpcm_admin_preview_remittance(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  fee_pct numeric:=30;
  proc_pct numeric:=0;
  proc_fixed numeric:=0;
  proc_payer text:='client';
  frequency_name text:='Monthly';
  terms_days integer:=10;
  gross numeric:=0;
  reversal_total numeric:=0;
  net_total numeric:=0;
  processor_total numeric:=0;
  agency_total numeric:=0;
  client_processor_deduction numeric:=0;
  final_total numeric:=0;
  items_json jsonb:='[]'::jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if period_start_date is null or period_end_date is null or period_end_date<period_start_date then raise exception 'valid period dates are required'; end if;
  if not exists(select 1 from public.client_portfolio_assignments c where c.organization_id=oid and lower(c.client_email)=target and lower(trim(c.portfolio_name))=lower(portfolio)) then
    raise exception 'portfolio is not assigned to this client';
  end if;

  select f.agency_fee_percent,f.processor_fee_percent,f.processor_fee_fixed,lower(f.processor_fee_payer),f.remittance_frequency,f.payment_terms_days
  into fee_pct,proc_pct,proc_fixed,proc_payer,frequency_name,terms_days
  from public.client_fee_schedules f
  where f.organization_id=oid and lower(f.client_email)=target and lower(trim(f.portfolio_name))=lower(portfolio) and f.is_active=true
  limit 1;

  fee_pct:=coalesce(fee_pct,30); proc_pct:=coalesce(proc_pct,0); proc_fixed:=coalesce(proc_fixed,0);
  proc_payer:=coalesce(proc_payer,'client'); frequency_name:=coalesce(frequency_name,'Monthly'); terms_days:=coalesce(terms_days,10);

  with eligible as (
    select
      l.id::text payment_ledger_id,
      a.id::text account_id,
      coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name)),'Consumer') consumer_name,
      coalesce(a.account_number,a.client_account_number,a.source_account_id,'') account_number,
      l.payment_date,
      coalesce(l.payment_type,'Payment') payment_type,
      coalesce(l.payment_method,'Other') payment_method,
      abs(coalesce(l.amount,0)) gross_amount,
      case when lower(coalesce(l.payment_type,'payment')) in ('reversal','adjustment debit') then -abs(coalesce(l.amount,0)) else abs(coalesce(l.amount,0)) end signed_amount,
      case
        when lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') then
          case when coalesce(l.processor_fee,0)>0 then round(l.processor_fee,2)
               else round((abs(coalesce(l.amount,0))*proc_pct/100)+proc_fixed,2) end
        else 0
      end processor_fee,
      l.created_at
    from public.payments_ledger l
    join public.accounts a on a.id=l.account_id and a.organization_id=oid
    where l.organization_id=oid and lower(trim(coalesce(a.portfolio,'')))=lower(portfolio)
      and l.payment_date between period_start_date and period_end_date
      and lower(coalesce(l.status,''))='completed'
      and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit','reversal','adjustment debit')
      and not exists(
        select 1 from public.client_remittance_items ri
        where ri.organization_id=oid and ri.payment_ledger_id=l.id::text and ri.released=false
      )
  )
  select
    coalesce(sum(case when signed_amount>0 then signed_amount else 0 end),0),
    coalesce(sum(case when signed_amount<0 then abs(signed_amount) else 0 end),0),
    coalesce(sum(processor_fee),0),
    coalesce(jsonb_agg(jsonb_build_object(
      'payment_ledger_id',payment_ledger_id,'account_id',account_id,'consumer_name',consumer_name,
      'account_number',account_number,'payment_date',payment_date,'payment_type',payment_type,
      'payment_method',payment_method,'gross_amount',gross_amount,'signed_amount',signed_amount,
      'processor_fee',processor_fee
    ) order by payment_date,created_at),'[]'::jsonb)
  into gross,reversal_total,processor_total,items_json
  from eligible;

  net_total:=round(gross-reversal_total,2);
  agency_total:=round(greatest(net_total,0)*fee_pct/100,2);
  client_processor_deduction:=case when proc_payer='client' then processor_total else 0 end;
  final_total:=round(net_total-agency_total-client_processor_deduction+coalesce(manual_adjustment,0),2);

  return jsonb_build_object(
    'client_email',target,'portfolio_name',portfolio,'period_start',period_start_date,'period_end',period_end_date,
    'payment_count',jsonb_array_length(items_json),'gross_collections',round(gross,2),'reversals',round(reversal_total,2),
    'net_collections',round(net_total,2),'agency_fee_percent',round(fee_pct,4),'agency_fee_amount',round(agency_total,2),
    'processor_fee_percent',round(proc_pct,4),'processor_fee_fixed',round(proc_fixed,2),'processor_fees',round(processor_total,2),
    'processor_fee_payer',proc_payer,'client_processor_deduction',round(client_processor_deduction,2),
    'adjustments',round(coalesce(manual_adjustment,0),2),'net_remittance',round(final_total,2),
    'remittance_frequency',frequency_name,'payment_terms_days',terms_days,
    'suggested_due_date',period_end_date+terms_days,'items',items_json
  );
end $$;

create or replace function public.cpcm_admin_create_remittance_batch(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric,
  remittance_due_date date,
  batch_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  preview jsonb;
  new_batch public.client_remittance_batches%rowtype;
  item_record record;
  company_name text;
  number_value text;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  preview:=public.cpcm_admin_preview_remittance(target_client_email,target_portfolio_name,period_start_date,period_end_date,manual_adjustment);
  if coalesce((preview->>'payment_count')::integer,0)=0 then raise exception 'no unbatched completed payments were found for this period'; end if;

  select coalesce(nullif(trim(client_company_name),''),nullif(trim(full_name),''),lower(email)) into company_name
  from public.app_users where organization_id=oid and lower(email)=lower(trim(target_client_email)) limit 1;
  number_value:='REM-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.client_remittance_batches(
    organization_id,batch_number,client_email,client_company_name,portfolio_name,period_start,period_end,payment_count,
    gross_collections,reversals,net_collections,agency_fee_percent,agency_fee_amount,processor_fees,
    processor_fee_payer,adjustments,net_remittance,status,due_date,notes,created_by_email,updated_at
  ) values(
    oid,number_value,lower(trim(target_client_email)),company_name,trim(target_portfolio_name),period_start_date,period_end_date,
    (preview->>'payment_count')::integer,(preview->>'gross_collections')::numeric,(preview->>'reversals')::numeric,
    (preview->>'net_collections')::numeric,(preview->>'agency_fee_percent')::numeric,(preview->>'agency_fee_amount')::numeric,
    (preview->>'processor_fees')::numeric,preview->>'processor_fee_payer',(preview->>'adjustments')::numeric,
    (preview->>'net_remittance')::numeric,'Draft',coalesce(remittance_due_date,(preview->>'suggested_due_date')::date),
    nullif(trim(batch_notes),''),actor,now()
  ) returning * into new_batch;

  for item_record in select value item from jsonb_array_elements(preview->'items') loop
    insert into public.client_remittance_items(
      organization_id,batch_id,payment_ledger_id,account_id,consumer_name,account_number,payment_date,payment_type,payment_method,
      gross_amount,signed_amount,processor_fee,released
    ) values(
      oid,new_batch.id,item_record.item->>'payment_ledger_id',item_record.item->>'account_id',item_record.item->>'consumer_name',
      item_record.item->>'account_number',(item_record.item->>'payment_date')::date,item_record.item->>'payment_type',
      item_record.item->>'payment_method',(item_record.item->>'gross_amount')::numeric,(item_record.item->>'signed_amount')::numeric,
      (item_record.item->>'processor_fee')::numeric,false
    );
  end loop;

  return jsonb_build_object('ok',true,'batch',to_jsonb(new_batch));
end $$;

create or replace function public.cpcm_admin_update_remittance_batch(
  target_batch_id uuid,
  requested_action text,
  new_payment_reference text,
  new_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  current_batch public.client_remittance_batches%rowtype;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select * into current_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id for update;
  if not found then raise exception 'remittance batch not found'; end if;

  if action_name='approve' then
    if lower(current_batch.status)<>'draft' then raise exception 'only a draft batch can be approved'; end if;
    update public.client_remittance_batches set status='Approved',approved_at=now(),approved_by_email=actor,
      notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now() where organization_id=oid and id=target_batch_id;
  elsif action_name='paid' then
    if lower(current_batch.status)<>'approved' then raise exception 'approve the batch before marking it paid'; end if;
    update public.client_remittance_batches set status='Paid',paid_at=now(),paid_by_email=actor,
      payment_reference=nullif(trim(new_payment_reference),''),notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where organization_id=oid and id=target_batch_id;
  elsif action_name='draft' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot return to draft'; end if;
    update public.client_remittance_batches set status='Draft',approved_at=null,approved_by_email=null,updated_at=now()
      where organization_id=oid and id=target_batch_id;
  elsif action_name='void' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot be voided'; end if;
    update public.client_remittance_batches set status='Void',notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where organization_id=oid and id=target_batch_id;
    update public.client_remittance_items set released=true where organization_id=oid and batch_id=target_batch_id;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select * into current_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id;
  return jsonb_build_object('ok',true,'batch',to_jsonb(current_batch));
end $$;

create or replace function public.cpcm_remittance_batch_detail(target_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  selected_batch public.client_remittance_batches%rowtype;
  oid uuid:=private.current_organization_id(); is_admin boolean:=private.is_organization_admin(oid);
begin
  select * into selected_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id limit 1;
  if not found then raise exception 'remittance batch not found'; end if;
  if not is_admin and not (lower(selected_batch.client_email)=actor and lower(selected_batch.status) in ('approved','paid')) then
    raise exception 'not authorized for this remittance statement';
  end if;
  return jsonb_build_object(
    'batch',to_jsonb(selected_batch),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.payment_date,i.consumer_name) from public.client_remittance_items i where i.organization_id=oid and i.batch_id=target_batch_id),'[]'::jsonb)
  );
end $$;

create or replace function public.cpcm_client_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  profile_row public.app_users%rowtype;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where organization_id=oid and lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false)
     or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then
    raise exception 'client portal access is not approved';
  end if;

  return jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'company_name',profile_row.client_company_name,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object(
      'pending_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status)='approved'),0),
      'paid_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status)='paid'),0),
      'agency_fees',coalesce((select sum(agency_fee_amount) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'processor_fees',coalesce((select sum(processor_fees) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'statement_count',coalesce((select count(*) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'last_remittance_date',(select max(coalesce(paid_at,approved_at,created_at)) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid'))
    ),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.period_end desc,b.created_at desc) from (
      select * from public.client_remittance_batches
      where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')
      order by period_end desc,created_at desc limit 100
    ) b),'[]'::jsonb)
  );
end $$;

revoke all on function public.cpcm_admin_remittance_snapshot() from public;
revoke all on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) from public;
revoke all on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) from public;
revoke all on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) from public;
revoke all on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) from public;
revoke all on function public.cpcm_remittance_batch_detail(uuid) from public;
revoke all on function public.cpcm_client_remittance_snapshot() from public;

grant select on public.client_fee_schedules,public.client_remittance_batches,public.client_remittance_items to authenticated;
grant execute on function public.cpcm_admin_remittance_snapshot() to authenticated;
grant execute on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) to authenticated;
grant execute on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) to authenticated;
grant execute on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) to authenticated;
grant execute on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) to authenticated;
grant execute on function public.cpcm_remittance_batch_detail(uuid) to authenticated;
grant execute on function public.cpcm_client_remittance_snapshot() to authenticated;

notify pgrst,'reload schema';

-- END MULTI_TENANT_PHASE12_REMITTANCE_RPCS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE13_COMMISSIONS_PAYMENT_APPROVALS.sql
-- ============================================================================
-- Phase 13: tenant-safe commissions and payment approval overrides. NON-PRODUCTION FIRST.
begin;

create or replace function public.cpcm_confirm_payment_sale_credit(target_approval_request_id uuid,target_employee_email text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare req public.payment_approval_requests%rowtype; staff_count integer; oid uuid:=private.current_organization_id(); actor text:=lower(coalesce(auth.jwt()->>'email',''));
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select count(*) into staff_count from public.app_users where organization_id=oid and lower(email)=lower(target_employee_email) and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if staff_count<>1 then raise exception 'Active approved employee not found in current organization'; end if;
 select * into req from public.payment_approval_requests where organization_id=oid and id=target_approval_request_id for update;
 if not found then raise exception 'Payment request not found'; end if;
 if lower(coalesce(req.status,''))<>'pending' then raise exception 'Sale credit can only be confirmed before Admin processes a pending payment'; end if;
 update public.payment_approval_requests set sale_credit_email=lower(target_employee_email),sale_credit_confirmed_by_email=actor,sale_credit_confirmed_at=now(),updated_at=now() where organization_id=oid and id=req.id;
 return jsonb_build_object('ok',true,'approval_request_id',req.id,'sale_credit_email',lower(target_employee_email));
end $$;

create or replace function public.cpcm_record_approved_commission(target_approval_request_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare req public.payment_approval_requests%rowtype; led public.payments_ledger%rowtype; rate numeric; eid uuid; earned numeric; actor text:=lower(coalesce(auth.jwt()->>'email','')); credit_email text; oid uuid:=private.current_organization_id();
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select * into req from public.payment_approval_requests where organization_id=oid and id=target_approval_request_id for update;
 if not found then raise exception 'Approval request not found'; end if;
 if lower(coalesce(req.status,'')) not in ('approved','completed','paid') or req.ledger_id is null or req.reviewed_by_email is null then raise exception 'Payment has not been approved and finalized by Admin'; end if;
 credit_email:=lower(coalesce(req.sale_credit_email,'')); if credit_email='' or req.sale_credit_confirmed_by_email is null then raise exception 'Admin must confirm which employee got the sale'; end if;
 select * into led from public.payments_ledger where organization_id=oid and id=req.ledger_id;
 if not found then raise exception 'Approved ledger entry not found'; end if;
 if lower(coalesce(led.status,'')) not in ('completed','paid','settled','processed','success') or lower(coalesce(led.gateway_provider,''))<>'nmi' or coalesce(led.gateway_transaction_id,'')='' then raise exception 'Ledger is not a finalized approved NMI payment'; end if;
 select commission_rate into rate from public.app_users where organization_id=oid and lower(email)=credit_email and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if not found then raise exception 'Credited employee not found'; end if;
 earned:=round(coalesce(led.amount,led.payment_amount,0)*rate/100,2);
 insert into public.employee_commission_earnings(organization_id,ledger_id,approval_request_id,employee_email,gross_amount,commission_rate,earned_amount,status,approved_by_email,approved_at)
 values(oid,led.id,req.id,credit_email,coalesce(led.amount,led.payment_amount,0),rate,earned,'Earned',lower(req.reviewed_by_email),coalesce(req.reviewed_at,led.paid_at,led.created_at,now())) on conflict(approval_request_id) do nothing returning id into eid;
 if eid is null then select id into eid from public.employee_commission_earnings where organization_id=oid and approval_request_id=req.id; end if;
 return jsonb_build_object('ok',true,'earning_id',eid,'employee_email',credit_email,'gross_amount',coalesce(led.amount,led.payment_amount,0),'commission_rate',rate,'earned_amount',earned);
end $$;

create or replace function public.cpcm_commission_from_approved_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare led public.payments_ledger%rowtype; rate numeric; earned numeric; credit_email text; oid uuid;
begin
 oid:=new.organization_id; if oid is null then return new; end if;
 if new.ledger_id is null or new.reviewed_by_email is null or lower(coalesce(new.status,'')) not in ('approved','completed','paid') then return new; end if;
 if exists(select 1 from public.employee_commission_earnings where organization_id=oid and approval_request_id=new.id) then return new; end if;
 credit_email:=lower(coalesce(new.sale_credit_email,'')); if credit_email='' or new.sale_credit_confirmed_by_email is null or new.sale_credit_confirmed_at is null then return new; end if;
 select * into led from public.payments_ledger where organization_id=oid and id=new.ledger_id;
 if not found or lower(coalesce(led.status,'')) not in ('completed','paid','settled','processed','success') or lower(coalesce(led.gateway_provider,''))<>'nmi' or coalesce(led.gateway_transaction_id,'')='' then return new; end if;
 select commission_rate into rate from public.app_users where organization_id=oid and lower(email)=credit_email and lower(coalesce(role,''))='employee' and coalesce(is_active,true) and coalesce(is_approved,true);
 if rate is null then return new; end if;
 earned:=round(coalesce(led.amount,led.payment_amount,0)*rate/100,2);
 insert into public.employee_commission_earnings(organization_id,ledger_id,approval_request_id,employee_email,gross_amount,commission_rate,earned_amount,status,approved_by_email,approved_at)
 values(oid,led.id,new.id,credit_email,coalesce(led.amount,led.payment_amount,0),rate,earned,'Earned',lower(new.reviewed_by_email),coalesce(new.reviewed_at,led.paid_at,led.created_at,now())) on conflict do nothing;
 return new;
end $$;

create or replace function public.cpcm_admin_commission_staff()
returns table(email text,full_name text,role text,is_active boolean,commission_rate numeric) language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 return query select u.email,u.full_name,u.role,u.is_active,u.commission_rate from public.app_users u where u.organization_id=oid and lower(coalesce(u.role,'')) in ('admin','employee') and coalesce(u.is_active,true) order by lower(u.email);
end $$;

create or replace function public.cpcm_my_commission_summary()
returns jsonb language sql stable security invoker set search_path=public as $$
 with me as(select lower(coalesce(auth.jwt()->>'email','')) email,private.current_organization_id() oid),
 e as(select x.* from public.employee_commission_earnings x,me where x.organization_id=me.oid and lower(x.employee_email)=me.email and x.status='Earned'),
 rate as(select u.commission_rate from public.app_users u,me where u.organization_id=me.oid and lower(u.email)=me.email limit 1)
 select jsonb_build_object('commission_rate',coalesce((select commission_rate from rate),0),'today',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('day',now())),0),'week',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('week',now())),0),'month',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('month',now())),0),'year',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('year',now())),0),'gross_month',coalesce((select sum(gross_amount) from e where approved_at>=date_trunc('month',now())),0),'deal_count_month',(select count(*) from e where approved_at>=date_trunc('month',now())),'recent',coalesce((select jsonb_agg(jsonb_build_object('approved_at',approved_at,'gross_amount',gross_amount,'commission_rate',commission_rate,'earned_amount',earned_amount,'ledger_id',ledger_id) order by approved_at desc) from(select * from e order by approved_at desc limit 100)q),'[]'::jsonb));
$$;

revoke execute on function public.cpcm_confirm_payment_sale_credit(uuid,text) from public,anon;
revoke execute on function public.cpcm_record_approved_commission(uuid) from public,anon;
revoke execute on function public.cpcm_admin_commission_staff() from public,anon;
revoke execute on function public.cpcm_my_commission_summary() from public,anon;
grant execute on function public.cpcm_confirm_payment_sale_credit(uuid,text) to authenticated;
grant execute on function public.cpcm_record_approved_commission(uuid) to authenticated;
grant execute on function public.cpcm_admin_commission_staff() to authenticated;
grant execute on function public.cpcm_my_commission_summary() to authenticated;
revoke all on function public.cpcm_commission_from_approved_payment() from public,anon,authenticated;
commit;

-- Supplemental override: commission-rate administration.
create or replace function public.cpcm_set_employee_commission(target_email text,rate_percent numeric)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare updated_count integer; oid uuid:=private.current_organization_id();
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if rate_percent<0 or rate_percent>100 then raise exception 'Commission rate must be between 0 and 100'; end if;
 update public.app_users set commission_rate=round(rate_percent,4),updated_at=now()
 where organization_id=oid and lower(email)=lower(target_email) and lower(coalesce(role,''))='employee';
 get diagnostics updated_count=row_count; if updated_count<>1 then raise exception 'Employee not found in current organization'; end if;
 return jsonb_build_object('ok',true,'employee_email',lower(target_email),'commission_rate',round(rate_percent,4));
end $$;
revoke execute on function public.cpcm_set_employee_commission(text,numeric) from public,anon;
grant execute on function public.cpcm_set_employee_commission(text,numeric) to authenticated;

-- END MULTI_TENANT_PHASE13_COMMISSIONS_PAYMENT_APPROVALS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE2_TENANT_FENCE_DRAFT.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 2 DRAFT
-- DO NOT APPLY TO LIVE YET.
-- Prerequisite: MULTI_TENANT_PHASE1_FOUNDATION.sql has passed on a non-production database.
-- This layer is designed to preserve existing role/assignment/client policies while adding a restrictive tenant fence.

begin;

-- Stamp writes from authenticated tenant users at the database boundary.
-- Ordinary users cannot choose another tenant by manipulating browser requests.
create or replace function private.stamp_current_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_org uuid;
begin
  if private.is_platform_admin() then
    -- Platform admin may explicitly target a tenant. If omitted, retain the compatibility default.
    return new;
  end if;

  current_org := private.current_organization_id();
  if current_org is null then
    raise exception 'No active organization membership for authenticated user' using errcode='42501';
  end if;

  new.organization_id := current_org;
  return new;
end $$;

revoke all on function private.stamp_current_organization() from public;
grant execute on function private.stamp_current_organization() to authenticated;

-- Known agency-scoped tables. Phase 1 guarantees organization_id exists on every table that exists.
do $$
declare
  t text;
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
      execute format('alter table public.%I enable row level security',t);

      -- Separate policies per operation, deliberately RESTRICTIVE so they AND with the app's existing role policies.
      execute format('drop policy if exists cpcm_tenant_select on public.%I',t);
      execute format(
        'create policy cpcm_tenant_select on public.%I as restrictive for select to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_insert on public.%I',t);
      execute format(
        'create policy cpcm_tenant_insert on public.%I as restrictive for insert to authenticated with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_update on public.%I',t);
      execute format(
        'create policy cpcm_tenant_update on public.%I as restrictive for update to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id()) with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_delete on public.%I',t);
      execute format(
        'create policy cpcm_tenant_delete on public.%I as restrictive for delete to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop trigger if exists cpcm_stamp_organization on public.%I',t);
      execute format(
        'create trigger cpcm_stamp_organization before insert on public.%I for each row execute function private.stamp_current_organization()',t
      );
    end if;
  end loop;
end $$;

-- IMPORTANT: Keep the legacy DEFAULT during the first test pass so current production-shaped code can still be exercised.
-- After Agency A/B deny-tests and all server-side functions are tenant-aware, Phase 3 removes that default.

commit;

-- REQUIRED TEST GATE BEFORE LIVE:
-- 1. Create Agency A and Agency B test auth users and memberships.
-- 2. Insert at least one account under each agency.
-- 3. As Agency A: SELECT/UPDATE/DELETE Agency B account must return no row / be denied.
-- 4. As Agency A: INSERT with Agency B organization_id must be overwritten to Agency A or denied.
-- 5. Repeat A<->B for payments_ledger, payment_plans, team_messages and account_docs.
-- 6. Confirm collector assignment restrictions still work inside the same agency.
-- 7. Confirm Client portfolio restrictions still work inside the same agency.
-- 8. Confirm platform admin can inspect both tenants.
-- 9. Confirm anon/public recruiting flows have not been unintentionally changed.
-- 10. Only after all tests pass: remove temporary legacy organization defaults.
-- END MULTI_TENANT_PHASE2_TENANT_FENCE_DRAFT.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE14_LEGACY_POLICY_CLEANUP.sql
-- ============================================================================
-- Phase 14: remove legacy single-company authorization policies after Phase 2 tenant fences exist.
-- NON-PRODUCTION FIRST. Restrictive cpcm_tenant_* policies remain the cross-tenant boundary.
begin;

-- AI surfaces: agency admins manage only rows already fenced to their organization.
do $$ declare r record; begin
 for r in select * from (values
 ('ai_call_qa','ai_call_qa_admin_insert'),('ai_call_qa','ai_call_qa_admin_select'),('ai_call_qa','ai_call_qa_admin_update'),
 ('ai_collector_script_profiles','ai_script_admin_select'),('ai_collector_script_profiles','ai_script_admin_write'),
 ('account_communication_compliance','account_comm_compliance_admin_select'),('account_communication_compliance','account_comm_compliance_admin_write'),
 ('ai_call_runtime_config','ai_runtime_admin_select'),('ai_real_call_attempts','ai_real_attempt_admin_select'),
 ('ai_caller_id_config','ai_caller_id_admin_select'),('ai_caller_id_config','ai_caller_id_admin_write'),
 ('ai_bland_pathway_config','ai_bland_pathway_admin_select'),('ai_bland_pathway_config','ai_bland_pathway_admin_write'),
 ('ai_conversation_events','ai_conversation_events_admin_select')
 ) x(tbl,pol) loop
  if to_regclass('public.'||r.tbl) is not null then execute format('drop policy if exists %I on public.%I',r.pol,r.tbl); end if;
 end loop;
end $$;

-- Explicit agency-admin policies. These are permissive feature policies; Phase 2 restrictive tenant policies
-- still require organization_id=current organization for every row.
do $$ declare t text; begin
 foreach t in array array['ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_caller_id_config','ai_bland_pathway_config','ai_conversation_events'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy %I on public.%I for select to authenticated using (private.is_organization_admin(organization_id) or private.is_platform_admin())','cpcm_agency_admin_select',t);
  end if;
 end loop;
 foreach t in array array['ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_caller_id_config','ai_bland_pathway_config'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy %I on public.%I for all to authenticated using (private.is_organization_admin(organization_id) or private.is_platform_admin()) with check (private.is_organization_admin(organization_id) or private.is_platform_admin())','cpcm_agency_admin_write',t);
  end if;
 end loop;
end $$;

-- Commission legacy feature policy: keep employee self-view and agency-admin view, tenant fence still applies.
drop policy if exists employee_commission_select_own_or_admin on public.employee_commission_earnings;
create policy employee_commission_select_own_or_admin on public.employee_commission_earnings for select to authenticated
using(lower(employee_email)=lower(coalesce(auth.jwt()->>'email','')) or private.is_organization_admin(organization_id) or private.is_platform_admin());

commit;

-- END MULTI_TENANT_PHASE14_LEGACY_POLICY_CLEANUP.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql
-- ============================================================================
-- Phase 15: recruiting is PLATFORM-GLOBAL in SaaS v1, not agency-owned.
-- Public applicants are applying to Co Pilot/Ready Collect Go itself; attaching anonymous submissions
-- to an agency through the legacy Ready Collect Go default would be unsafe and semantically wrong.
begin;

-- Undo Phase 1 ownership only if these columns were introduced by the multi-tenant draft.
-- Run this before production cutover; staging should verify no downstream FK/policy depends on them.
do $$ declare t text; begin
 foreach t in array array['job_applications','recruiter_applications','recruiter_candidate_profiles'] loop
  if to_regclass('public.'||t) is not null then
   execute format('drop trigger if exists cpcm_stamp_organization on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_select on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_insert on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_update on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_delete on public.%I',t);
   if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='organization_id') then
    execute format('alter table public.%I drop column organization_id',t);
   end if;
  end if;
 end loop;
end $$;

-- Recruiter applications remain public INSERT-only; review is platform-admin-only.
drop policy if exists recruiter_applications_admin_select on public.recruiter_applications;
drop policy if exists recruiter_applications_admin_update on public.recruiter_applications;
create policy recruiter_applications_platform_select on public.recruiter_applications for select to authenticated using(private.is_platform_admin());
create policy recruiter_applications_platform_update on public.recruiter_applications for update to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin());

-- Job applications use the same platform-level review rule while preserving their existing public submission policy.
do $$ begin
 if to_regclass('public.job_applications') is not null then
  drop policy if exists job_applications_admin_select on public.job_applications;
  drop policy if exists job_applications_admin_update on public.job_applications;
  create policy job_applications_platform_select on public.job_applications for select to authenticated using(private.is_platform_admin());
  create policy job_applications_platform_update on public.job_applications for update to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin());
 end if;
end $$;
commit;

-- END MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE17_MESSENGER_STAFF_RPCS.sql
-- ============================================================================
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 17
-- Tenant-safe Messenger staff naming and directory RPCs.

create or replace function public.cpcm_update_staff_display_name(target_email text, new_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  target text := lower(trim(coalesce(target_email,'')));
  clean text := nullif(trim(coalesce(new_full_name,'')),'');
  oid uuid := private.current_organization_id();
  actor_is_admin boolean := private.is_organization_admin(oid);
begin
  if actor_email = '' or oid is null then raise exception 'not authenticated in an organization'; end if;
  if target = '' then raise exception 'target_email required'; end if;
  if not (actor_is_admin or actor_email = target) then raise exception 'not allowed'; end if;

  update public.app_users
     set full_name=clean, updated_at=now()
   where organization_id=oid and lower(email)=target;

  if not found then
    if actor_email <> target then raise exception 'staff user not found in current organization'; end if;
    insert into public.app_users
      (organization_id,email,role,full_name,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values
      (oid,target,'employee',clean,'pending',false,false,now(),now(),now());
  end if;
  return jsonb_build_object('ok',true,'email',target,'full_name',clean);
end;
$$;

revoke all on function public.cpcm_update_staff_display_name(text,text) from public,anon;
grant execute on function public.cpcm_update_staff_display_name(text,text) to authenticated;

create or replace function public.cpcm_staff_directory()
returns table(email text,role text,full_name text,approval_status text,is_approved boolean,is_active boolean,last_seen_at timestamptz,updated_at timestamptz,created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.email,u.role,u.full_name,u.approval_status,u.is_approved,u.is_active,u.last_seen_at,u.updated_at,u.created_at
  from public.app_users u
  where u.organization_id=private.current_organization_id()
    and lower(coalesce(u.role,'')) in ('admin','agency_admin','employee','collector')
    and coalesce(u.is_active,true) is not false
    and lower(coalesce(u.approval_status,'')) not in ('removed','rejected','fired')
  order by lower(u.email);
$$;

revoke all on function public.cpcm_staff_directory() from public,anon;
grant execute on function public.cpcm_staff_directory() to authenticated;
notify pgrst,'reload schema';

-- END MULTI_TENANT_PHASE17_MESSENGER_STAFF_RPCS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE16_STAGING_READINESS.sql
-- ============================================================================
-- Phase 16: staging readiness / fail-closed checks.
-- Read-only except for assertions. Run after Phases 1-15 in a NON-PRODUCTION project.
do $$ declare n bigint; begin
 select count(*) into n from public.organization_members where is_active group by auth_user_id having count(*)>1 limit 1;
 if n is not null then raise exception 'STAGING BLOCKED: a login has more than one active organization membership'; end if;
 if not exists(select 1 from pg_indexes where schemaname='public' and tablename='organization_members' and indexname='organization_members_one_active_org_per_user') then raise exception 'STAGING BLOCKED: one-active-org membership index missing'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('recruiter_applications','job_applications','recruiter_candidate_profiles') and column_name='organization_id') then raise exception 'STAGING BLOCKED: platform-global recruiting still has tenant ownership column'; end if;
 if to_regclass('public.recruiter_applications') is not null and not exists(select 1 from pg_policies where schemaname='public' and tablename='recruiter_applications' and policyname='recruiter_applications_platform_select') then raise exception 'STAGING BLOCKED: recruiter platform review policy missing'; end if;
 raise notice 'PHASE 16 READINESS CHECKS PASSED';
end $$;

-- Manual staging gate after this assertion passes:
-- 1. Agency A and Agency B each get exactly one login/membership.
-- 2. Run Phase 7 REST/JWT cross-tenant tests.
-- 3. Exercise client portal, payment approval/commission, remittance, AI, voice broadcast and RingCentral paths.
-- 4. Exercise anonymous recruiter submission and verify neither agency can read it; platform admin can.
-- 5. Only then execute Phase 8 to remove temporary legacy organization defaults.

-- END MULTI_TENANT_PHASE16_STAGING_READINESS.sql

-- ============================================================================
-- BEGIN MULTI_TENANT_PHASE7_ISOLATION_ASSERTIONS.sql
-- ============================================================================
-- Co Pilot Collections — Phase 7: Agency A/B isolation assertions
-- STAGING/DISPOSABLE PROJECT ONLY. Execute after Phases 1-6 and Phase 2 tenant fences.
-- This file intentionally contains assertions, not production seed credentials.

-- PRECHECK: every tenant-scoped table that exists must have organization_id, RLS enabled,
-- and the four restrictive cpcm_tenant_* policies.
do $$
declare t text; missing text[]:=array[]::text[]; r record; begin
 foreach t in array array[
  'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises',
  'payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions',
  'import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments',
  'client_fee_schedules','client_remittance_batches','client_remittance_items','nmi_transactions','payment_approval_requests',
  'nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence','ringcentral_call_records',
  'employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
  'voice_broadcast_calls','voice_broadcast_live_transfers',
  'ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts',
  'ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'
 ] loop
  if to_regclass('public.'||t) is not null then
   if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='organization_id') then missing:=array_append(missing,t||':organization_id'); end if;
   if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then missing:=array_append(missing,t||':rls'); end if;
   for r in select x from unnest(array['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete']) x loop
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=r.x) then missing:=array_append(missing,t||':'||r.x); end if;
   end loop;
  end if;
 end loop;
 if cardinality(missing)>0 then raise exception 'TENANT PRECHECK FAILED: %',array_to_string(missing,', '); end if;
 raise notice 'TENANT PRECHECK PASSED';
end $$;

-- Test execution procedure:
-- A. Create two staging auth users and two organizations; give each user exactly one active organization_members row.
-- B. Sign in as Agency A through the normal client JWT. Insert A account/payment plan/message/document.
-- C. Sign in as Agency B and insert equivalent B records.
-- D. With A JWT, direct REST SELECT by each B primary key must return []. UPDATE/DELETE must affect 0 rows.
-- E. With A JWT, INSERT containing B organization_id must never create a B-owned row (trigger overwrites to A or RLS denies).
-- F. Repeat D/E for accounts, payments_ledger, payment_plans, team_messages, account_docs, AI attempts, campaigns, call records.
-- G. Verify existing intra-agency collector/client policies still restrict rows within Agency A.
-- H. Verify platform admin can inspect A and B only through explicit platform-admin membership/control.
-- I. Verify anon recruiter submission remains limited to intended insert surface and cannot read tenant data.
-- J. Remove temporary legacy organization_id defaults only after A-I pass.

-- END MULTI_TENANT_PHASE7_ISOLATION_ASSERTIONS.sql
