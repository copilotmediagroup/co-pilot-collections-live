begin;
do $$ declare d text; begin
 if to_regprocedure('public.cpcm_bootstrap_current_agency_admin_profile()') is null then raise exception 'PHASE30 BLOCKED: bootstrap RPC missing'; end if;
 select pg_get_functiondef('public.cpcm_bootstrap_current_agency_admin_profile()'::regprocedure) into d;
 if d not ilike '%auth.uid()%' or d not ilike '%auth.users%' then raise exception 'PHASE30 BLOCKED: identity is not derived from authenticated user'; end if;
 if d not ilike '%organization_members%' or d not ilike '%agency_admin%' then raise exception 'PHASE30 BLOCKED: trusted admin membership is not required'; end if;
 if d not ilike '%organizations%' or d not ilike '%active%' then raise exception 'PHASE30 BLOCKED: tenant lifecycle is not enforced'; end if;
 if has_function_privilege('anon','public.cpcm_bootstrap_current_agency_admin_profile()','EXECUTE') then raise exception 'PHASE30 BLOCKED: anon can bootstrap admin'; end if;
 if not has_function_privilege('authenticated','public.cpcm_bootstrap_current_agency_admin_profile()','EXECUTE') then raise exception 'PHASE30 BLOCKED: authenticated cannot reach guarded bootstrap'; end if;
 raise notice 'PHASE30 AGENCY ADMIN PROFILE BOOTSTRAP GATE PASSED';
end $$;
rollback;
