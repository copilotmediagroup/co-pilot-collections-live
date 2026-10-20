\set ON_ERROR_STOP on
BEGIN;

-- DEMO-only Phase 8 gate. Removes the legacy organization default only from
-- present tenant tables, then proves no present tenant table retains a default.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
    'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
    'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
    'team_messages','team_typing_status','team_presence'
  ] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('alter table public.%I alter column organization_id drop default',t);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE leftovers text[];
BEGIN
  SELECT array_agg(c.table_name ORDER BY c.table_name)
    INTO leftovers
  FROM information_schema.columns c
  WHERE c.table_schema='public'
    AND c.column_name='organization_id'
    AND c.table_name IN (
      'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
      'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
      'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
      'team_messages','team_typing_status','team_presence'
    )
    AND c.column_default IS NOT NULL;
  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'DEMO PHASE 8 BLOCKED: organization_id defaults remain on %', array_to_string(leftovers,', ');
  END IF;
  RAISE NOTICE 'DEMO PHASE 8 DEFAULT REMOVAL VERIFIED';
END $$;

COMMIT;
\echo 'DEMO PHASE 8 CUTOVER COMMITTED; legacy organization defaults removed from present core tenant tables.'
