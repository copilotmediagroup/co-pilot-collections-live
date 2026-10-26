\set ON_ERROR_STOP on
-- LIVE read-only structural verification after the pre-cutover foundation installer.
-- This gate does NOT authorize Phase 8. It proves the structural prerequisites that
-- must exist before separate behavioral Agency A/B isolation testing can begin.
BEGIN READ ONLY;
DO $$
DECLARE
  t text;
  p text;
  missing text[] := ARRAY[]::text[];
  legacy_default_tables text[] := ARRAY[]::text[];
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
  IF to_regclass('public.organizations') IS NULL THEN missing:=array_append(missing,'organizations'); END IF;
  IF to_regclass('public.organization_members') IS NULL THEN missing:=array_append(missing,'organization_members'); END IF;
  IF to_regprocedure('private.current_organization_id()') IS NULL THEN missing:=array_append(missing,'private.current_organization_id()'); END IF;
  IF to_regprocedure('private.is_platform_admin()') IS NULL THEN missing:=array_append(missing,'private.is_platform_admin()'); END IF;

  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id' AND is_nullable='NO') THEN
        missing:=array_append(missing,t||':organization_id_not_null');
      END IF;
      SELECT CASE WHEN column_default IS NOT NULL THEN t END
        INTO p
        FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='organization_id';
      IF p IS NOT NULL THEN legacy_default_tables:=array_append(legacy_default_tables,p); END IF;
    END IF;
  END LOOP;

  IF cardinality(missing)>0 THEN
    RAISE EXCEPTION 'POST-FOUNDATION STRUCTURAL GATE BLOCKED: %',array_to_string(missing,', ');
  END IF;
  IF cardinality(legacy_default_tables)=0 THEN
    RAISE EXCEPTION 'POST-FOUNDATION STRUCTURAL GATE BLOCKED: legacy organization defaults are already absent; Phase 8 state is ambiguous';
  END IF;

  -- The production tenant-fence stage is intentionally held from the pre-cutover foundation. Restrictive tenant
  -- policies must therefore NOT be mistaken as already proven by this structural gate.
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND policyname IN ('cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete')
  ) THEN
    RAISE EXCEPTION 'POST-FOUNDATION STRUCTURAL GATE BLOCKED: tenant fence policies already exist before the production tenant-fence stage; investigate partial cutover state';
  END IF;

  RAISE NOTICE 'POST-FOUNDATION STRUCTURE PASSED. HOLD PHASE 8: run the separate production tenant-fence stage and Agency A/B behavioral isolation proof first.';
END $$;
ROLLBACK;
\echo 'POST-FOUNDATION STRUCTURAL GATE PASSED — PHASE 8 REMAINS HOLD.'
