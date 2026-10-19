\set ON_ERROR_STOP on
BEGIN;
select id::text a_user,coalesce(email,'') a_email from auth.users order by created_at,id limit 1 \gset
insert into public.organizations(id,name,slug,status,plan,is_demo) values ('10000000-0000-4000-8000-000000000001','Agency A Role Test','agency-a-role-test','active','test',true) on conflict(id) do update set is_demo=true;
update public.organization_members set is_active=false where auth_user_id=:'a_user'::uuid;
insert into public.organization_members(organization_id,auth_user_id,role,is_active) values ('10000000-0000-4000-8000-000000000001',:'a_user'::uuid,'collector',true) on conflict(organization_id,auth_user_id) do update set role='collector',is_active=true;
update public.app_users set organization_id='10000000-0000-4000-8000-000000000001'::uuid,role='employee',is_active=true,is_approved=true,approval_status='approved' where lower(email)=lower(:'a_email');
with r as (select id,row_number() over(order by id) rn from public.accounts limit 2) update public.accounts a set organization_id='10000000-0000-4000-8000-000000000001'::uuid,assigned_to_email=case when r.rn=1 then :'a_email' else 'other-collector@example.invalid' end from r where a.id=r.id;
select id::text assigned_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid and lower(assigned_to_email)=lower(:'a_email') limit 1 \gset
select id::text other_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid and assigned_to_email='other-collector@example.invalid' limit 1 \gset
select set_config('cpcm.test_assigned',:'assigned_account',true),set_config('cpcm.test_other',:'other_account',true);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $t$ DECLARE n int; BEGIN
 select count(*) into n from public.accounts where id=current_setting('cpcm.test_assigned')::uuid; if n<>1 then raise exception 'FAIL collector assigned'; end if;
 select count(*) into n from public.accounts where id=current_setting('cpcm.test_other')::uuid; if n<>0 then raise exception 'FAIL collector cross-assignment'; end if;
 raise notice 'PASS: collector assignment restriction preserved';
END $t$;
reset role;
ROLLBACK;
\echo 'DEMO COLLECTOR ROLE TEST PASSED; rolled back.'
