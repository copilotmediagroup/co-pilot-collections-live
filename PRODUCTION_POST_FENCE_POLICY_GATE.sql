\set ON_ERROR_STOP on
-- LIVE read-only verification for feature policies that depend on restrictive tenant fences.
BEGIN READ ONLY;
DO $$
DECLARE t text; p text; missing text[]:=ARRAY[]::text[];
BEGIN
  -- Fence must exist on every present table touched by the held feature policies.
  FOREACH t IN ARRAY ARRAY['accounts','client_portfolio_assignments','employee_commission_earnings','ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_caller_id_config','ai_bland_pathway_config','ai_conversation_events'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOREACH p IN ARRAY ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'] LOOP
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t
           AND policyname=p AND permissive='RESTRICTIVE'
        ) THEN missing:=array_append(missing,t||':'||p); END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF to_regclass('public.accounts') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='cpcm_account_collector_select' AND permissive='PERMISSIVE') THEN missing:=array_append(missing,'accounts:collector_select'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounts' AND policyname='cpcm_account_client_portfolio_select' AND permissive='PERMISSIVE') THEN missing:=array_append(missing,'accounts:client_portfolio_select'); END IF;
  END IF;
  IF to_regclass('public.client_portfolio_assignments') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_portfolio_assignments' AND policyname='cpcm_client_portfolio_assignment_select' AND permissive='PERMISSIVE') THEN missing:=array_append(missing,'client_portfolio_assignments:client_select'); END IF;
  IF to_regclass('public.employee_commission_earnings') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='employee_commission_earnings' AND policyname='employee_commission_select_own_or_admin' AND permissive='PERMISSIVE') THEN missing:=array_append(missing,'employee_commission_earnings:self_view'); END IF;
  IF cardinality(missing)>0 THEN RAISE EXCEPTION 'POST-FENCE FEATURE POLICY GATE BLOCKED: %',array_to_string(missing,', '); END IF;
  RAISE NOTICE 'POST-FENCE FEATURE POLICIES VERIFIED. HOLD PHASE 8 until Agency A/B behavioral isolation proof passes.';
END $$;
ROLLBACK;
\echo 'POST-FENCE FEATURE POLICY GATE PASSED — PHASE 8 REMAINS HOLD.'
