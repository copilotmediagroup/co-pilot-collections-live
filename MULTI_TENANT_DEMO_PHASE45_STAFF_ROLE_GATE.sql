begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_admin_set_staff_role(text,text)'::regprocedure) into d;
 if d not ilike '%private.is_organization_admin%' or d not ilike '%organization_members%' then raise exception 'PHASE45 BLOCKED: staff role RPC lacks tenant membership synchronization'; end if;
 if has_function_privilege('anon','public.cpcm_admin_set_staff_role(text,text)','EXECUTE') then raise exception 'PHASE45 BLOCKED: anon can execute staff role RPC'; end if;
 raise notice 'PHASE45 STAFF ROLE GATE PASSED';
end $$;
rollback;
