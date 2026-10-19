\set ON_ERROR_STOP on
BEGIN;
-- Entire test is rolled back. It leaves DEMO data and memberships unchanged.
select id::text as a_user,coalesce(email,'') as a_email from auth.users order by created_at,id limit 1 \gset
select id::text as b_user,coalesce(email,'') as b_email from auth.users where id <> :'a_user'::uuid order by created_at,id limit 1 \gset
\if :{?b_user}
\else
  \echo 'DEMO ISOLATION TEST BLOCKED: requires two auth users'
  \quit 3
\endif

insert into public.organizations(id,name,slug,status,plan,is_demo) values
('10000000-0000-4000-8000-000000000001','Agency A Isolation Test','agency-a-isolation-test','active','test',true),
('20000000-0000-4000-8000-000000000002','Agency B Isolation Test','agency-b-isolation-test','active','test',true)
on conflict(id) do update set name=excluded.name,is_demo=true;

update public.organization_members set is_active=false where auth_user_id in (:'a_user'::uuid,:'b_user'::uuid);
delete from private.platform_admins where auth_user_id in (:'a_user'::uuid,:'b_user'::uuid);
insert into public.organization_members(organization_id,auth_user_id,role,is_active) values
('10000000-0000-4000-8000-000000000001',:'a_user'::uuid,'agency_admin',true),
('20000000-0000-4000-8000-000000000002',:'b_user'::uuid,'agency_admin',true)
on conflict(organization_id,auth_user_id) do update set role='agency_admin',is_active=true;
update public.app_users set organization_id='10000000-0000-4000-8000-000000000001'::uuid where lower(email)=lower(:'a_email');
update public.app_users set organization_id='20000000-0000-4000-8000-000000000002'::uuid where lower(email)=lower(:'b_email');

-- Put two existing fake DEMO accounts into A and B for the duration of the test.
with r as (select id,row_number() over(order by id) rn from public.accounts limit 2)
update public.accounts a set organization_id=case when r.rn=1 then '10000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end
from r where a.id=r.id;
select id::text as a_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid limit 1 \gset
select id::text as b_account from public.accounts where organization_id='20000000-0000-4000-8000-000000000002'::uuid limit 1 \gset

-- Reassign two existing fake messages when available.
with r as (select id,row_number() over(order by id) rn from public.team_messages limit 2)
update public.team_messages m set organization_id=case when r.rn=1 then '10000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end
from r where m.id=r.id;

select set_config('cpcm.test_a_account',:'a_account',true);
select set_config('cpcm.test_b_account',:'b_account',true);
select count(*)::text as b_message_count from public.team_messages where organization_id='20000000-0000-4000-8000-000000000002'::uuid \gset
select set_config('cpcm.test_b_message_count',:'b_message_count',true);
create temporary table cpcm_stamp_probe(id uuid primary key default gen_random_uuid(),organization_id uuid not null);
create trigger cpcm_stamp_organization before insert on cpcm_stamp_probe for each row execute function private.stamp_current_organization();
grant insert,select on cpcm_stamp_probe to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);

DO $test$
DECLARE n int; oid uuid;
BEGIN
  IF private.current_organization_id() <> '10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'A tenant resolution failed'; END IF;
  select count(*) into n from public.accounts where id=current_setting('cpcm.test_b_account')::uuid;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: Agency A can SELECT Agency B account'; END IF;
  update public.accounts set status=status where id=current_setting('cpcm.test_b_account')::uuid;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: Agency A can UPDATE Agency B account'; END IF;
  delete from public.accounts where id=current_setting('cpcm.test_b_account')::uuid;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: Agency A can DELETE Agency B account'; END IF;
  select count(*) into n from public.accounts where id=current_setting('cpcm.test_a_account')::uuid;
  IF n<>1 THEN RAISE EXCEPTION 'FAIL: Agency A cannot see its own test account'; END IF;
  RAISE NOTICE 'PASS: Agency A account SELECT/UPDATE/DELETE fence';
END $test$;

-- Probe the same organization-stamping trigger used on every tenant table.
insert into cpcm_stamp_probe(organization_id) values ('20000000-0000-4000-8000-000000000002')
returning organization_id::text as stamped_org \gset
select (:'stamped_org' = '10000000-0000-4000-8000-000000000001') as stamped_ok \gset
\if :stamped_ok
  \echo 'PASS: forged Agency B organization_id stamped to Agency A'
\else
  \echo 'FAIL: forged organization_id was not stamped to Agency A'
  \quit 4
\endif

DO $test$
DECLARE n int;
BEGIN
  IF current_setting('cpcm.test_b_message_count')::int>0 THEN
    select count(*) into n from public.team_messages where organization_id='20000000-0000-4000-8000-000000000002'::uuid;
    IF n<>0 THEN RAISE EXCEPTION 'FAIL: Agency A can SELECT Agency B team_messages'; END IF;
  END IF;
  RAISE NOTICE 'PASS: Agency A team_messages tenant fence';
END $test$;

-- Reciprocal B -> A account fence.
select set_config('request.jwt.claims',json_build_object('sub',:'b_user','role','authenticated','email',:'b_email')::text,true);
DO $test$
DECLARE n int;
BEGIN
  IF private.current_organization_id() <> '20000000-0000-4000-8000-000000000002'::uuid THEN RAISE EXCEPTION 'B tenant resolution failed'; END IF;
  select count(*) into n from public.accounts where id=current_setting('cpcm.test_a_account')::uuid;
  IF n<>0 THEN RAISE EXCEPTION 'FAIL: Agency B can SELECT Agency A account'; END IF;
  select count(*) into n from public.accounts where id=current_setting('cpcm.test_b_account')::uuid;
  IF n<>1 THEN RAISE EXCEPTION 'FAIL: Agency B cannot see its own test account'; END IF;
  RAISE NOTICE 'PASS: Agency B reciprocal account fence';
END $test$;

-- Platform admin must be able to inspect both tenants.
reset role;
insert into private.platform_admins(auth_user_id) values (:'a_user'::uuid) on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $test$
DECLARE n int;
BEGIN
  IF NOT private.is_platform_admin() THEN RAISE EXCEPTION 'FAIL: platform admin resolution'; END IF;
  select count(*) into n from public.accounts where id in (current_setting('cpcm.test_a_account')::uuid,current_setting('cpcm.test_b_account')::uuid);
  IF n<>2 THEN RAISE EXCEPTION 'FAIL: platform admin cannot inspect both tenant accounts'; END IF;
  RAISE NOTICE 'PASS: platform admin can inspect both tenant accounts';
END $test$;

reset role;
select set_config('request.jwt.claims','{}',true);
ROLLBACK;
\echo 'DEMO ISOLATION SMOKE TEST PASSED; A/B reciprocal + stamping + platform-admin checks rolled back.'
