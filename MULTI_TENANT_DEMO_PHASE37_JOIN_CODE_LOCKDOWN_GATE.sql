begin;
do $$ declare d text; begin
 if has_table_privilege('anon','public.organization_join_codes','SELECT') or has_table_privilege('authenticated','public.organization_join_codes','SELECT') then raise exception 'PHASE37 BLOCKED: join code table can be enumerated directly'; end if;
 select pg_get_functiondef('public.cpcm_admin_create_join_code(text,timestamptz)'::regprocedure) into d;
 if d not ilike '%gen_random_bytes(12)%' or d not ilike '%1, 20%' then raise exception 'PHASE37 BLOCKED: join code entropy below hardened target'; end if;
 if has_function_privilege('anon','public.cpcm_admin_list_join_codes()','EXECUTE') then raise exception 'PHASE37 BLOCKED: anon can list join codes'; end if;
 raise notice 'PHASE37 JOIN CODE LOCKDOWN GATE PASSED';
end $$;
rollback;
