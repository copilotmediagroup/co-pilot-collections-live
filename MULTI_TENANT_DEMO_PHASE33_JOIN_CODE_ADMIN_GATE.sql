begin;
do $$ declare d text; sig text; begin
 foreach sig in array array['public.cpcm_admin_create_join_code(text,timestamp with time zone)','public.cpcm_admin_list_join_codes()','public.cpcm_admin_set_join_code_active(uuid,boolean)'] loop
   if to_regprocedure(sig) is null then raise exception 'PHASE33 BLOCKED: missing %',sig; end if;
   if has_function_privilege('anon',sig,'EXECUTE') then raise exception 'PHASE33 BLOCKED: anon execute on %',sig; end if;
 end loop;
 select pg_get_functiondef('public.cpcm_admin_create_join_code(text,timestamp with time zone)'::regprocedure) into d;
 if d not ilike '%private.is_organization_admin%' or d not ilike '%employee%' or d not ilike '%client%' then raise exception 'PHASE33 BLOCKED: create guard/role restriction missing'; end if;
 select pg_get_functiondef('public.cpcm_admin_set_join_code_active(uuid,boolean)'::regprocedure) into d;
 if d not ilike '%organization_id = oid%' then raise exception 'PHASE33 BLOCKED: mutation is not tenant-scoped'; end if;
 raise notice 'PHASE33 JOIN CODE ADMIN GATE PASSED';
end $$;
rollback;
