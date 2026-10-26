\set ON_ERROR_STOP on
-- Production tenant-fence stage. Execute only after the pre-cutover foundation and its post-install gate pass.
-- This is intentionally separate from the foundation and from Phase 8. Legacy organization_id defaults remain in place.
-- Requires explicit LIVE authorization.
BEGIN;

-- Browser inserts are tenant-stamped; trusted backend/migration roles must supply organization_id explicitly.
create or replace function private.stamp_current_organization()
returns trigger language plpgsql set search_path='' as $cpcm$
declare current_org uuid;
begin
  if current_user in ('postgres','service_role','supabase_admin') then
    if new.organization_id is null then raise exception 'Trusted tenant write requires organization_id' using errcode='23502'; end if;
    return new;
  end if;
  if private.is_platform_admin() then return new; end if;
  current_org:=private.current_organization_id();
  if current_org is null then raise exception 'No active organization membership for authenticated user' using errcode='42501'; end if;
  new.organization_id:=current_org;
  return new;
end $cpcm$;
revoke all on function private.stamp_current_organization() from public,anon;
grant execute on function private.stamp_current_organization() to authenticated,service_role;

DO $cpcm$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
    'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
    'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
    'nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence',
    'ringcentral_call_records','employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
    'voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa','ai_collector_script_profiles','account_communication_compliance',
    'ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id' AND is_nullable='NO') THEN
        RAISE EXCEPTION 'TENANT FENCE BLOCKED: %.organization_id is missing or nullable',t;
      END IF;
      EXECUTE format('alter table public.%I enable row level security',t);
      EXECUTE format('drop policy if exists cpcm_tenant_select on public.%I',t);
      EXECUTE format('create policy cpcm_tenant_select on public.%I as restrictive for select to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t);
      EXECUTE format('drop policy if exists cpcm_tenant_insert on public.%I',t);
      EXECUTE format('create policy cpcm_tenant_insert on public.%I as restrictive for insert to authenticated with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t);
      EXECUTE format('drop policy if exists cpcm_tenant_update on public.%I',t);
      EXECUTE format('create policy cpcm_tenant_update on public.%I as restrictive for update to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id()) with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t);
      EXECUTE format('drop policy if exists cpcm_tenant_delete on public.%I',t);
      EXECUTE format('create policy cpcm_tenant_delete on public.%I as restrictive for delete to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t);
      EXECUTE format('drop trigger if exists cpcm_stamp_organization on public.%I',t);
      EXECUTE format('create trigger cpcm_stamp_organization before insert on public.%I for each row execute function private.stamp_current_organization()',t);
    END IF;
  END LOOP;
END $cpcm$;
COMMIT;
\echo 'PRODUCTION TENANT FENCE INSTALLED. PHASE 8 REMAINS HOLD pending Agency A/B behavioral isolation proof.'
