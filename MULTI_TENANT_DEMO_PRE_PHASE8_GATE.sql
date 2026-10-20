\set ON_ERROR_STOP on
-- DEMO-only final structural gate before removing legacy organization defaults.
DO $$
DECLARE t text; missing text[]:=array[]::text[]; r record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
    'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
    'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
    'team_messages','team_typing_status','team_presence'
  ] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id') THEN missing:=array_append(missing,t||':organization_id'); END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN missing:=array_append(missing,t||':rls'); END IF;
      FOR r IN SELECT x FROM unnest(ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete']) x LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=r.x) THEN missing:=array_append(missing,t||':'||r.x); END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF cardinality(missing)>0 THEN RAISE EXCEPTION 'DEMO PRE-PHASE8 BLOCKED: %',array_to_string(missing,', '); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='cpcm_account_collector_select' AND permissive='PERMISSIVE') THEN RAISE EXCEPTION 'DEMO PRE-PHASE8 BLOCKED: collector SELECT path missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='cpcm_account_client_portfolio_select' AND permissive='PERMISSIVE') THEN RAISE EXCEPTION 'DEMO PRE-PHASE8 BLOCKED: client account SELECT path missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_portfolio_assignments' AND policyname='cpcm_client_portfolio_assignment_select' AND permissive='PERMISSIVE') THEN RAISE EXCEPTION 'DEMO PRE-PHASE8 BLOCKED: client assignment SELECT path missing'; END IF;
  RAISE NOTICE 'DEMO PRE-PHASE8 STRUCTURAL GATE PASSED';
END $$;
\echo 'DEMO PRE-PHASE8 GATE PASSED.'
