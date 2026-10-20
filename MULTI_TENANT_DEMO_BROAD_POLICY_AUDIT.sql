\set ON_ERROR_STOP on
-- DEMO read-only broad policy inventory/audit. No data or policy mutations.
\echo '--- CPCM DEMO broad tenant policy inventory ---'
WITH tenant_tables(table_name) AS (VALUES
 ('app_users'),('accounts'),('account_notes'),('activity_logs'),('payment_plans'),('payment_plan_payments'),('payment_promises'),('payments_ledger'),
 ('account_docs'),('call_results'),('follow_ups'),('disputes'),('settlements'),('audit_logs'),('role_permissions'),('import_batches'),('company_settings'),
 ('collector_alerts'),('compliance_events'),('client_portfolio_assignments'),('client_fee_schedules'),('client_remittance_batches'),('client_remittance_items'),
 ('team_messages'),('team_typing_status'),('team_presence')
)
SELECT p.tablename,p.policyname,p.permissive,p.roles,p.cmd,p.qual,p.with_check
FROM pg_policies p JOIN tenant_tables t ON t.table_name=p.tablename
WHERE p.schemaname='public'
ORDER BY p.tablename,p.permissive,p.cmd,p.policyname;

DO $$
DECLARE missing_rls text[]; missing_fence text[]; suspicious text[];
BEGIN
 SELECT array_agg(c.relname ORDER BY c.relname) INTO missing_rls
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname=ANY(ARRAY[
 'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items','team_messages','team_typing_status','team_presence'])
 AND c.relkind='r' AND NOT c.relrowsecurity;
 IF missing_rls IS NOT NULL THEN RAISE EXCEPTION 'BROAD POLICY AUDIT FAIL: RLS disabled on %',array_to_string(missing_rls,', '); END IF;

 SELECT array_agg(x.table_name ORDER BY x.table_name) INTO missing_fence FROM (
   SELECT c.relname table_name
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=ANY(ARRAY[
   'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items','team_messages','team_typing_status','team_presence'])
   AND c.relkind='r'
   GROUP BY c.relname
   HAVING count(*) FILTER (WHERE EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname AND p.policyname IN ('cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'))) < 4
 ) x;
 IF missing_fence IS NOT NULL THEN RAISE EXCEPTION 'BROAD POLICY AUDIT FAIL: incomplete cpcm tenant fence on %',array_to_string(missing_fence,', '); END IF;

 SELECT array_agg(p.tablename||'.'||p.policyname ORDER BY p.tablename,p.policyname) INTO suspicious
 FROM pg_policies p
 WHERE p.schemaname='public' AND p.tablename=ANY(ARRAY[
 'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items','team_messages','team_typing_status','team_presence'])
 AND p.permissive='PERMISSIVE'
 AND (coalesce(p.qual,'') ~* '(afinch2678@gmail\\.com|demo-admin@|demo-employee@)' OR coalesce(p.with_check,'') ~* '(afinch2678@gmail\\.com|demo-admin@|demo-employee@)' OR (coalesce(p.qual,'') ~ '^\\s*true\\s*$' AND coalesce(p.with_check,'') ~ '^\\s*(true)?\\s*$'));
 IF suspicious IS NOT NULL THEN RAISE EXCEPTION 'BROAD POLICY AUDIT FAIL: suspicious permissive policies %',array_to_string(suspicious,', '); END IF;
 RAISE NOTICE 'DEMO BROAD POLICY AUDIT PASSED: RLS enabled, four-operation tenant fence present, no known hardcoded/demo/global-true permissive policy detected.';
END $$;
