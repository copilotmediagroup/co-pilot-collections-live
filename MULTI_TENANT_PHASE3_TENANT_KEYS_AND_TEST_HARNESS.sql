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
