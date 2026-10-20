-- DEMO structural gate for lifecycle enforcement. No persistent data changes.
begin;
do $$
declare d text;
begin
  select pg_get_functiondef('private.current_organization_id()'::regprocedure) into d;
  if d not ilike '%public.organizations%' or d not ilike '%status%' or d not ilike '%active%' or d not ilike '%demo%' then
    raise exception 'PHASE28 BLOCKED: current tenant resolution does not enforce organization status';
  end if;
  select pg_get_functiondef('private.is_organization_admin(uuid)'::regprocedure) into d;
  if d not ilike '%public.organizations%' or d not ilike '%status%' then
    raise exception 'PHASE28 BLOCKED: organization-admin helper does not enforce organization status';
  end if;
  if has_function_privilege('anon','private.current_organization_id()','EXECUTE') then raise exception 'PHASE28 BLOCKED: anon can resolve tenant'; end if;
  if has_function_privilege('anon','private.is_organization_admin(uuid)','EXECUTE') then raise exception 'PHASE28 BLOCKED: anon can test org admin'; end if;
  raise notice 'PHASE28 ORGANIZATION STATUS ENFORCEMENT GATE PASSED';
end $$;
rollback;
