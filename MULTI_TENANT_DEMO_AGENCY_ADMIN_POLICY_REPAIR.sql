\set ON_ERROR_STOP on
BEGIN;

-- DEMO repair after removal of legacy owner-email permissive policies.
-- Phase 2 cpcm_tenant_* RESTRICTIVE policies remain the cross-tenant boundary.
-- This restores the intended agency-admin/platform-admin permissive feature path
-- without any hard-coded person/email identity.
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
      EXECUTE format('DROP POLICY IF EXISTS cpcm_org_admin_access ON public.%I',t);
      EXECUTE format(
        'CREATE POLICY cpcm_org_admin_access ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (private.is_platform_admin() OR private.is_organization_admin(organization_id)) WITH CHECK (private.is_platform_admin() OR private.is_organization_admin(organization_id))',t
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE missing text[];
BEGIN
  SELECT array_agg(c.table_name ORDER BY c.table_name) INTO missing
  FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.column_name='organization_id'
    AND c.table_name IN (
      'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
      'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
      'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
      'team_messages','team_typing_status','team_presence'
    )
    AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.table_name AND p.policyname='cpcm_org_admin_access');
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'DEMO ADMIN POLICY REPAIR FAILED on %',array_to_string(missing,', '); END IF;
  RAISE NOTICE 'DEMO AGENCY-ADMIN PERMISSIVE POLICY REPAIR VERIFIED';
END $$;

COMMIT;
\echo 'DEMO AGENCY-ADMIN POLICY REPAIR COMMITTED.'
