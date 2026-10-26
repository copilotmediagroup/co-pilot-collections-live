\set ON_ERROR_STOP on
-- Co Pilot Collections — LIVE production foundation pre-mutation compatibility gate.
-- READ ONLY. This file must never alter LIVE state.
begin read only;

do $$
declare
  missing text[] := array[]::text[];
  t text;
  required_tables text[] := array[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments',
    'payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements',
    'audit_logs','role_permissions','import_batches','company_settings','collector_alerts','client_portfolio_assignments',
    'client_fee_schedules','client_remittance_batches','client_remittance_items','nmi_transactions','payment_approval_requests'
  ];
begin
  if current_database() <> 'postgres' then raise exception 'unexpected database: %',current_database(); end if;
  if to_regclass('auth.users') is null then raise exception 'auth.users is missing'; end if;
  foreach t in array required_tables loop
    if to_regclass('public.'||t) is null then missing := array_append(missing,t); end if;
  end loop;
  if cardinality(missing)>0 then raise exception 'required legacy tables missing: %',array_to_string(missing,', '); end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='app_users' and column_name='email') then raise exception 'app_users.email missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='app_users' and column_name='role') then raise exception 'app_users.role missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='id') then raise exception 'accounts.id missing'; end if;
end $$;

-- Fail closed on ambiguous partial foundation state. A clean legacy LIVE has neither table;
-- a rerun/continuation must be handled deliberately rather than guessed.
do $$
declare a boolean := to_regclass('public.organizations') is not null; m boolean := to_regclass('public.organization_members') is not null;
begin
  if a <> m then raise exception 'partial multi-tenant foundation detected: organizations=% organization_members=%',a,m; end if;
  if a and m then raise exception 'multi-tenant foundation already exists; use a continuation/reconciliation plan, not the fresh foundation installer'; end if;
end $$;

select 'PASS production foundation pre-mutation compatibility — legacy prerequisites present, no partial foundation detected' as result;
rollback;
