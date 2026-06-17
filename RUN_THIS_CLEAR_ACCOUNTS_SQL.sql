
-- CLEAR ACCOUNTS SECURE RPC FIX
-- Run this in Supabase SQL Editor.
-- It creates a secure admin-only function that clears account data without long browser DELETE URLs.

create or replace function public.admin_clear_accounts()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  c_payment_plan_payments int := 0;
  c_payment_plans int := 0;
  c_payments_ledger int := 0;
  c_account_docs int := 0;
  c_account_notes int := 0;
  c_activity_logs int := 0;
  c_follow_ups int := 0;
  c_call_results int := 0;
  c_disputes int := 0;
  c_settlements int := 0;
  c_import_batches int := 0;
  c_accounts int := 0;
begin
  if v_email <> 'afinch2678@gmail.com' then
    raise exception 'Admin only';
  end if;

  delete from public.payment_plan_payments;
  get diagnostics c_payment_plan_payments = row_count;

  delete from public.payment_plans;
  get diagnostics c_payment_plans = row_count;

  delete from public.payments_ledger;
  get diagnostics c_payments_ledger = row_count;

  delete from public.account_docs;
  get diagnostics c_account_docs = row_count;

  delete from public.account_notes;
  get diagnostics c_account_notes = row_count;

  delete from public.activity_logs;
  get diagnostics c_activity_logs = row_count;

  delete from public.follow_ups;
  get diagnostics c_follow_ups = row_count;

  delete from public.call_results;
  get diagnostics c_call_results = row_count;

  delete from public.disputes;
  get diagnostics c_disputes = row_count;

  delete from public.settlements;
  get diagnostics c_settlements = row_count;

  delete from public.import_batches;
  get diagnostics c_import_batches = row_count;

  delete from public.accounts;
  get diagnostics c_accounts = row_count;

  return json_build_object(
    'ok', true,
    'counts', json_build_object(
      'accounts', c_accounts,
      'account_notes', c_account_notes,
      'activity_logs', c_activity_logs,
      'payment_plans', c_payment_plans,
      'payment_plan_payments', c_payment_plan_payments,
      'payments_ledger', c_payments_ledger,
      'account_docs', c_account_docs,
      'follow_ups', c_follow_ups,
      'call_results', c_call_results,
      'disputes', c_disputes,
      'settlements', c_settlements,
      'import_batches', c_import_batches
    )
  );
end;
$$;

revoke all on function public.admin_clear_accounts() from public;
grant execute on function public.admin_clear_accounts() to authenticated;
