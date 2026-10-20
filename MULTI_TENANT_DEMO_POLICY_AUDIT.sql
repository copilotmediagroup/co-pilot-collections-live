\set ON_ERROR_STOP on
-- DEMO audit: fail if any policy on a core tenant table still embeds the known
-- legacy owner identity or obviously bypasses the tenant helper model.
SELECT schemaname,tablename,policyname,cmd,qual,with_check
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
ORDER BY tablename,policyname;

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
  ) THEN RAISE EXCEPTION 'DEMO POLICY AUDIT FAILED: legacy owner-email policy remains'; END IF;
  RAISE NOTICE 'DEMO CORE POLICY AUDIT PASSED: no legacy owner-email policy remains';
END $$;
