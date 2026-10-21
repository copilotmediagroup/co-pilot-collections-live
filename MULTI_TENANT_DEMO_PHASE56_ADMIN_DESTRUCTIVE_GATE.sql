begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_admin_delete_payment_plan(uuid)'::regprocedure) into d;
 if d not ilike '%is_organization_admin%' or d not ilike '%organization_id=oid%' then raise exception 'PHASE56 BLOCKED: payment-plan delete lacks tenant/admin guard'; end if;
 select pg_get_functiondef('public.cpcm_admin_delete_settlement(uuid)'::regprocedure) into d;
 if d not ilike '%is_organization_admin%' or d not ilike '%organization_id=oid%' then raise exception 'PHASE56 BLOCKED: settlement delete lacks tenant/admin guard'; end if;
 if has_function_privilege('anon','public.cpcm_admin_delete_payment_plan(uuid)','EXECUTE') or has_function_privilege('anon','public.cpcm_admin_delete_settlement(uuid)','EXECUTE') then raise exception 'PHASE56 BLOCKED: anon destructive execute'; end if;
 raise notice 'PHASE56 ADMIN DESTRUCTIVE GATE PASSED';
end $$;
rollback;
