\set ON_ERROR_STOP on
BEGIN;

-- DEMO-only cleanup. Phase 2 cpcm_tenant_* restrictive policies are already
-- installed and tested. Remove old single-company policies that hard-code the
-- legacy owner email from present core tenant tables.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
        'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
        'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
        'team_messages','team_typing_status','team_presence'
      )
      AND (
        lower(coalesce(qual,'')) LIKE '%afinch2678@gmail.com%'
        OR lower(coalesce(with_check,'')) LIKE '%afinch2678@gmail.com%'
      )
  LOOP
    RAISE NOTICE 'Dropping legacy policy %.% / %', r.schemaname, r.tablename, r.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
        'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
        'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
        'team_messages','team_typing_status','team_presence'
      )
      AND (lower(coalesce(qual,'')) LIKE '%afinch2678@gmail.com%' OR lower(coalesce(with_check,'')) LIKE '%afinch2678@gmail.com%')
  ) THEN RAISE EXCEPTION 'DEMO LEGACY POLICY CLEANUP FAILED: owner-email policy remains'; END IF;
  RAISE NOTICE 'DEMO LEGACY OWNER-EMAIL POLICY CLEANUP VERIFIED';
END $$;

COMMIT;
\echo 'DEMO LEGACY POLICY CLEANUP COMMITTED.'
