-- DEMO-only synthetic status lifecycle test. Requires :platform_user and :agency_admin_user.
-- Uses a synthetic tenant and rolls everything back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'platform_user', true);
select set_config('request.jwt.claim.role','authenticated',true);
update public.organization_members set is_active=false where auth_user_id=:'agency_admin_user'::uuid;
create temporary table p28_org(id uuid);
insert into p28_org select public.cpcm_platform_provision_organization('P28 Synthetic Agency','p28-synthetic-agency',:'agency_admin_user'::uuid,'test',true);

-- Active/demo tenant resolves for its agency admin.
select set_config('request.jwt.claim.sub', :'agency_admin_user', true);
do $$ declare oid uuid; begin
  select id into oid from p28_org;
  if private.current_organization_id() is distinct from oid then raise exception 'P28 FAILED: active/demo tenant did not resolve'; end if;
  if not private.is_organization_admin(oid) then raise exception 'P28 FAILED: active agency admin not recognized'; end if;
end $$;

-- Platform suspends tenant.
select set_config('request.jwt.claim.sub', :'platform_user', true);
select public.cpcm_platform_set_organization_status((select id from p28_org),'suspended');
select set_config('request.jwt.claim.sub', :'agency_admin_user', true);
do $$ declare oid uuid; begin
  select id into oid from p28_org;
  if private.current_organization_id() is not null then raise exception 'P28 FAILED: suspended tenant still resolves'; end if;
  if private.is_organization_admin(oid) then raise exception 'P28 FAILED: suspended agency admin still authorized'; end if;
end $$;

-- Platform reactivates tenant and access resolves again.
select set_config('request.jwt.claim.sub', :'platform_user', true);
select public.cpcm_platform_set_organization_status((select id from p28_org),'active');
select set_config('request.jwt.claim.sub', :'agency_admin_user', true);
do $$ declare oid uuid; begin
  select id into oid from p28_org;
  if private.current_organization_id() is distinct from oid then raise exception 'P28 FAILED: reactivated tenant did not resolve'; end if;
  raise notice 'PHASE28 SYNTHETIC STATUS LIFECYCLE PASSED';
end $$;
rollback;
