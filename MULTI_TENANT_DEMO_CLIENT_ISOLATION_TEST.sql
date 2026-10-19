\set ON_ERROR_STOP on
BEGIN;
select id::text a_user,coalesce(email,'') a_email from auth.users order by created_at,id limit 1 \gset
insert into public.organizations(id,name,slug,status,plan,is_demo) values ('10000000-0000-4000-8000-000000000001','Agency A Client Test','agency-a-client-test','active','test',true) on conflict(id) do update set is_demo=true;
update public.organization_members set is_active=false where auth_user_id=:'a_user'::uuid;
insert into public.organization_members(organization_id,auth_user_id,role,is_active) values ('10000000-0000-4000-8000-000000000001',:'a_user'::uuid,'client',true) on conflict(organization_id,auth_user_id) do update set role='client',is_active=true;
update public.app_users set organization_id='10000000-0000-4000-8000-000000000001'::uuid,role='client',is_active=true,is_approved=true,approval_status='approved' where lower(email)=lower(:'a_email');
with r as (select id,row_number() over(order by id) rn from public.accounts limit 2) update public.accounts a set organization_id='10000000-0000-4000-8000-000000000001'::uuid,assigned_to_email=:'a_email',portfolio=case when r.rn=1 then 'CPCM_ALLOWED_TEST' else 'CPCM_DENIED_TEST' end from r where a.id=r.id;
insert into public.client_portfolio_assignments(client_email,portfolio_name,organization_id) values (:'a_email','CPCM_ALLOWED_TEST','10000000-0000-4000-8000-000000000001'::uuid) on conflict(organization_id,client_email,portfolio_name) do nothing;
select id::text allowed_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid and portfolio='CPCM_ALLOWED_TEST' limit 1 \gset
select id::text denied_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid and portfolio='CPCM_DENIED_TEST' limit 1 \gset
select set_config('cpcm.test_allowed',:'allowed_account',true),set_config('cpcm.test_denied',:'denied_account',true);
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $t$ DECLARE n int; BEGIN
 if not public.cpcm_current_is_client() then raise exception 'FAIL client helper'; end if;
 select count(*) into n from public.accounts where id=current_setting('cpcm.test_allowed')::uuid; if n<>1 then raise exception 'FAIL client allowed portfolio'; end if;
 select count(*) into n from public.accounts where id=current_setting('cpcm.test_denied')::uuid; if n<>0 then raise exception 'FAIL client unassigned portfolio visible'; end if;
 update public.accounts set status=status where id=current_setting('cpcm.test_allowed')::uuid; get diagnostics n=row_count; if n<>0 then raise exception 'FAIL client account write allowed'; end if;
 raise notice 'PASS: client portfolio restriction and write deny preserved';
END $t$;
reset role;
ROLLBACK;
\echo 'DEMO CLIENT ISOLATION TEST PASSED; rolled back.'
