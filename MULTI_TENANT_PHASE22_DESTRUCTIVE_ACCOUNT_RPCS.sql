begin;
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 22
-- Tenant-bind destructive archive deletion and Clear Accounts operations.

create or replace function public.cpcm_delete_archived_account(target_account_id uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); a public.accounts%rowtype;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update;
 if not found then return jsonb_build_object('ok',true,'deleted',false,'already_missing',true); end if;
 if a.archived_at is null then raise exception 'Only archived accounts may be permanently deleted'; end if;
 delete from public.accounts where organization_id=oid and id=target_account_id and archived_at is not null;
 return jsonb_build_object('ok',true,'deleted',true,'account_id',target_account_id);
end; $$;

create or replace function public.cpcm_delete_archived_portfolio(target_portfolio text,expected_count integer default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); actual_count integer; deleted_count integer;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if target_portfolio is null or btrim(target_portfolio)='' then raise exception 'Portfolio required'; end if;
 perform 1 from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio for update;
 select count(*) into actual_count from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio;
 if actual_count=0 then return jsonb_build_object('ok',true,'deleted_count',0,'already_empty',true); end if;
 if expected_count is not null and actual_count<>expected_count then raise exception 'Archived portfolio changed during confirmation. Expected %, found %',expected_count,actual_count; end if;
 delete from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio;
 get diagnostics deleted_count=row_count; if deleted_count<>actual_count then raise exception 'Delete verification failed'; end if;
 return jsonb_build_object('ok',true,'deleted_count',deleted_count,'portfolio',target_portfolio);
end; $$;

create or replace function public.admin_clear_accounts()
returns json language plpgsql security definer set search_path=public as $$
declare
 oid uuid:=private.current_organization_id();
 c_payment_plan_payments int:=0;c_payment_plans int:=0;c_payments_ledger int:=0;c_account_docs int:=0;c_account_notes int:=0;c_activity_logs int:=0;c_follow_ups int:=0;c_call_results int:=0;c_disputes int:=0;c_settlements int:=0;c_import_batches int:=0;c_accounts int:=0;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 delete from public.payment_plan_payments where organization_id=oid; get diagnostics c_payment_plan_payments=row_count;
 delete from public.payment_plans where organization_id=oid; get diagnostics c_payment_plans=row_count;
 delete from public.payments_ledger where organization_id=oid; get diagnostics c_payments_ledger=row_count;
 delete from public.account_docs where organization_id=oid; get diagnostics c_account_docs=row_count;
 delete from public.account_notes where organization_id=oid; get diagnostics c_account_notes=row_count;
 delete from public.activity_logs where organization_id=oid; get diagnostics c_activity_logs=row_count;
 delete from public.follow_ups where organization_id=oid; get diagnostics c_follow_ups=row_count;
 delete from public.call_results where organization_id=oid; get diagnostics c_call_results=row_count;
 delete from public.disputes where organization_id=oid; get diagnostics c_disputes=row_count;
 delete from public.settlements where organization_id=oid; get diagnostics c_settlements=row_count;
 delete from public.import_batches where organization_id=oid; get diagnostics c_import_batches=row_count;
 delete from public.accounts where organization_id=oid; get diagnostics c_accounts=row_count;
 return json_build_object('ok',true,'counts',json_build_object('accounts',c_accounts,'account_notes',c_account_notes,'activity_logs',c_activity_logs,'payment_plans',c_payment_plans,'payment_plan_payments',c_payment_plan_payments,'payments_ledger',c_payments_ledger,'account_docs',c_account_docs,'follow_ups',c_follow_ups,'call_results',c_call_results,'disputes',c_disputes,'settlements',c_settlements,'import_batches',c_import_batches));
end; $$;
revoke all on function public.admin_clear_accounts() from public,anon;
grant execute on function public.admin_clear_accounts() to authenticated;
commit;
