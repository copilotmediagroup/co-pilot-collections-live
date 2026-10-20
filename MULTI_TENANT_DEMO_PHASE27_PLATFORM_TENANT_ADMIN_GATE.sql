-- DEMO structural gate for Phase 27. No persistent data changes.
begin;
do $$
declare d text; n boolean;
begin
  if to_regprocedure('public.cpcm_platform_set_organization_status(uuid,text)') is null then raise exception 'PHASE27 BLOCKED: status RPC missing'; end if;
  if to_regprocedure('public.cpcm_platform_list_organizations()') is null then raise exception 'PHASE27 BLOCKED: list RPC missing'; end if;
  select pg_get_functiondef('public.cpcm_platform_set_organization_status(uuid,text)'::regprocedure) into d;
  if d not ilike '%private.is_platform_admin()%' then raise exception 'PHASE27 BLOCKED: status RPC lacks platform guard'; end if;
  select has_function_privilege('anon','public.cpcm_platform_set_organization_status(uuid,text)','EXECUTE') into n;
  if n then raise exception 'PHASE27 BLOCKED: anon can set organization status'; end if;
  select has_function_privilege('anon','public.cpcm_platform_list_organizations()','EXECUTE') into n;
  if n then raise exception 'PHASE27 BLOCKED: anon can list organizations'; end if;
  raise notice 'PHASE27 PLATFORM TENANT ADMIN GATE PASSED';
end $$;
rollback;
