-- DEMO/STAGING structural gate for Phase 26. Safe: no tenant is created.
begin;
do $$
declare d text; anon_exec boolean; auth_exec boolean;
begin
  if to_regprocedure('public.cpcm_platform_provision_organization(text,text,uuid,text,boolean)') is null then
    raise exception 'PHASE26 BLOCKED: provisioning RPC missing';
  end if;
  select pg_get_functiondef('public.cpcm_platform_provision_organization(text,text,uuid,text,boolean)'::regprocedure) into d;
  if d not ilike '%private.is_platform_admin()%' then raise exception 'PHASE26 BLOCKED: platform-admin guard missing'; end if;
  if d not ilike '%auth.users%' then raise exception 'PHASE26 BLOCKED: auth user validation missing'; end if;
  if d not ilike '%organization_members%' or d not ilike '%agency_admin%' then raise exception 'PHASE26 BLOCKED: first agency-admin membership missing'; end if;
  if d not ilike '%is_active=true%' then raise exception 'PHASE26 BLOCKED: active membership conflict guard missing'; end if;
  select has_function_privilege('anon','public.cpcm_platform_provision_organization(text,text,uuid,text,boolean)','EXECUTE') into anon_exec;
  select has_function_privilege('authenticated','public.cpcm_platform_provision_organization(text,text,uuid,text,boolean)','EXECUTE') into auth_exec;
  if anon_exec then raise exception 'PHASE26 BLOCKED: anon can execute provisioning RPC'; end if;
  if not auth_exec then raise exception 'PHASE26 BLOCKED: authenticated platform admins cannot reach guarded RPC'; end if;
  raise notice 'PHASE26 PROVISIONING GATE PASSED';
end $$;
rollback;
