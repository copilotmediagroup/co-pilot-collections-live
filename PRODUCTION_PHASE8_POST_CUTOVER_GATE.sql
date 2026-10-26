\set ON_ERROR_STOP on
-- LIVE read-only verification after Phase 8. This proves legacy compatibility defaults are gone.
BEGIN READ ONLY;
DO $$
DECLARE
  t text;
  p text;
  leftovers text[] := ARRAY[]::text[];
  missing_fences text[] := ARRAY[]::text[];
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
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id' AND column_default IS NOT NULL) THEN
        leftovers:=array_append(leftovers,t);
      END IF;
      FOREACH p IN ARRAY ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'] LOOP
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
           WHERE schemaname='public' AND tablename=t
             AND policyname=p AND permissive='RESTRICTIVE'
        ) THEN
          missing_fences:=array_append(missing_fences,t||':'||p);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF cardinality(leftovers)>0 THEN RAISE EXCEPTION 'PHASE 8 POST-CUTOVER BLOCKED: organization_id defaults remain on %',array_to_string(leftovers,', '); END IF;
  IF cardinality(missing_fences)>0 THEN RAISE EXCEPTION 'PHASE 8 POST-CUTOVER BLOCKED: restrictive tenant fence missing on %',array_to_string(missing_fences,', '); END IF;
  RAISE NOTICE 'PHASE 8 POST-CUTOVER STRUCTURE PASSED: legacy defaults removed and all four restrictive tenant fences present on every tenant table.';
END $$;
ROLLBACK;
\echo 'PHASE 8 POST-CUTOVER GATE PASSED.'
