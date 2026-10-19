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