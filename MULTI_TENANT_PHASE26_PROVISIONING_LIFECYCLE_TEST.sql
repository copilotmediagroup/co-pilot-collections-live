-- Phase 26 synthetic provisioning lifecycle test.
-- Run on DEMO only after Phase 26 is installed. Requires :platform_user and :new_admin_user auth UUIDs.
-- All synthetic tenant data is rolled back.
begin;

-- Execute as platform admin identity.
set local role authenticated;
select set_config('request.jwt.claim.sub', :'platform_user', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Preconditions: caller must already be registered as platform admin; target must have no active membership.
do $$
begin
  if not private.is_platform_admin() then raise exception 'TEST BLOCKED: platform_user is not a platform admin'; end if;
end $$;

update public.organization_members set is_active=false where auth_user_id=:'new_admin_user'::uuid;

create temporary table cpcm_phase26_result(organization_id uuid);
insert into cpcm_phase26_result
select public.cpcm_platform_provision_organization(
  'CPCM Phase26 Synthetic Agency',
  'cpcm-phase26-synthetic-agency',
  :'new_admin_user'::uuid,
  'test',
  true
);

do $$
declare oid uuid; n integer;
begin
  select organization_id into oid from cpcm_phase26_result;
  if oid is null then raise exception 'TEST FAILED: no organization id returned'; end if;
  select count(*) into n from public.organizations where id=oid and slug='cpcm-phase26-synthetic-agency' and is_demo=true;
  if n<>1 then raise exception 'TEST FAILED: organization not created correctly'; end if;
  select count(*) into n from public.organization_members where organization_id=oid and auth_user_id=:'new_admin_user'::uuid and role='agency_admin' and is_active=true;
  if n<>1 then raise exception 'TEST FAILED: first agency admin membership not created correctly'; end if;
  raise notice 'PHASE26 SYNTHETIC PROVISIONING LIFECYCLE PASSED';
end $$;

rollback;
