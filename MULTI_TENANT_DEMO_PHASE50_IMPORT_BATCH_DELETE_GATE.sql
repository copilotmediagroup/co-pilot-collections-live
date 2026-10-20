begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_admin_delete_import_batch_accounts(uuid[])'::regprocedure) into d;
 if d not ilike '%private.is_organization_admin%' or d not ilike '%organization_id=oid%' then raise exception 'PHASE50 BLOCKED: import delete RPC lacks tenant/admin guard'; end if;
 if has_function_privilege('anon','public.cpcm_admin_delete_import_batch_accounts(uuid[])','EXECUTE') then raise exception 'PHASE50 BLOCKED: anon can execute import delete RPC'; end if;
 raise notice 'PHASE50 IMPORT DELETE GATE PASSED';
end $$;
rollback;
