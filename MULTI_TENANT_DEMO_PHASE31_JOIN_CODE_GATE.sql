begin;
do $$ declare d text; begin
 if to_regclass('public.organization_join_codes') is null then raise exception 'PHASE31 BLOCKED: join code table missing'; end if;
 if to_regprocedure('public.cpcm_join_organization(text)') is null then raise exception 'PHASE31 BLOCKED: join RPC missing'; end if;
 select pg_get_functiondef('public.cpcm_join_organization(text)'::regprocedure) into d;
 if d not ilike '%auth.uid()%' or d not ilike '%auth.users%' then raise exception 'PHASE31 BLOCKED: identity not auth-derived'; end if;
 if d ilike '%agency_admin%' or d ilike '%role=''admin''%' then raise exception 'PHASE31 BLOCKED: join path can grant admin'; end if;
 if d not ilike '%organizations%' or d not ilike '%status%' then raise exception 'PHASE31 BLOCKED: organization lifecycle not checked'; end if;
 if d not ilike '%join_role,false%' and d not ilike '%join_role, false%' then raise exception 'PHASE31 BLOCKED: pending membership must start inactive'; end if;
 if has_function_privilege('anon','public.cpcm_join_organization(text)','EXECUTE') then raise exception 'PHASE31 BLOCKED: anon can join'; end if;
 raise notice 'PHASE31 JOIN CODE GATE PASSED';
end $$;
rollback;
