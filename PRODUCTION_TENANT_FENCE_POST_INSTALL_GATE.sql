\set ON_ERROR_STOP on
-- Read-only structural verification after production tenant-fence installation.
-- Passing this gate does NOT authorize Phase 8; Agency A/B behavioral isolation must still pass.
BEGIN READ ONLY;
DO $$
DECLARE t text; p text; missing text[]:=ARRAY[]::text[]; tenant_tables text[]:=ARRAY[
'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items','nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence','ringcentral_call_records','employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts','voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'];
BEGIN
 IF to_regprocedure('private.stamp_current_organization()') IS NULL THEN missing:=array_append(missing,'private.stamp_current_organization()'); END IF;
 FOREACH t IN ARRAY tenant_tables LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN missing:=array_append(missing,t||':rls'); END IF;
   FOREACH p IN ARRAY ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=p AND permissive='RESTRICTIVE') THEN missing:=array_append(missing,t||':'||p); END IF;
   END LOOP;
   IF NOT EXISTS(SELECT 1 FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table=t AND trigger_name='cpcm_stamp_organization') THEN missing:=array_append(missing,t||':stamp_trigger'); END IF;
   IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id' AND column_default IS NOT NULL) THEN missing:=array_append(missing,t||':legacy_default_missing_before_phase8'); END IF;
  END IF;
 END LOOP;
 IF cardinality(missing)>0 THEN RAISE EXCEPTION 'TENANT FENCE POST-INSTALL BLOCKED: %',array_to_string(missing,', '); END IF;
 RAISE NOTICE 'TENANT FENCE STRUCTURE PASSED. HOLD PHASE 8 pending Agency A/B behavioral isolation proof.';
END $$;
ROLLBACK;
\echo 'TENANT FENCE STRUCTURAL GATE PASSED — PHASE 8 REMAINS HOLD.'
