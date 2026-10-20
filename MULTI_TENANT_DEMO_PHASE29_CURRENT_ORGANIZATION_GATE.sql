begin;
do $$ begin
 if to_regprocedure('public.cpcm_current_organization()') is null then raise exception 'PHASE29 BLOCKED: browser tenant resolver missing'; end if;
 if has_function_privilege('anon','public.cpcm_current_organization()','EXECUTE') then raise exception 'PHASE29 BLOCKED: anon can resolve tenant'; end if;
 if not has_function_privilege('authenticated','public.cpcm_current_organization()','EXECUTE') then raise exception 'PHASE29 BLOCKED: authenticated cannot resolve tenant'; end if;
 if pg_get_functiondef('public.cpcm_current_organization()'::regprocedure) not ilike '%private.current_organization_id()%' then raise exception 'PHASE29 BLOCKED: resolver bypasses status-aware helper'; end if;
 raise notice 'PHASE29 CURRENT ORGANIZATION GATE PASSED';
end $$;
rollback;
