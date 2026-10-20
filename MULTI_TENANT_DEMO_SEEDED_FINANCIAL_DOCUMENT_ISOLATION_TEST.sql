\set ON_ERROR_STOP on
BEGIN;
-- DEMO only. Synthetic financial/document rows are rolled back at the end.
select id::text as a_user,coalesce(email,'') as a_email from auth.users order by created_at,id limit 1 \gset
select id::text as b_user,coalesce(email,'') as b_email from auth.users where id <> :'a_user'::uuid order by created_at,id limit 1 \gset
\if :{?b_user}
\else
  \echo 'SEEDED FINANCIAL/DOCUMENT TEST BLOCKED: requires two auth users'
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

with r as (select id,row_number() over(order by id) rn from public.accounts limit 2)
update public.accounts a set organization_id=case when r.rn=1 then '10000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end from r where a.id=r.id;
select id::text as a_account from public.accounts where organization_id='10000000-0000-4000-8000-000000000001'::uuid limit 1 \gset
select id::text as b_account from public.accounts where organization_id='20000000-0000-4000-8000-000000000002'::uuid limit 1 \gset
-- Seed each tenant while its own authenticated context is active; Phase 8 removed legacy org defaults.
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
set local role authenticated;
insert into public.payment_plans(account_id,total_amount,starting_balance,remaining_amount,frequency,status,notes,created_by_email)
values (:'a_account'::uuid,111.11,111.11,111.11,'Monthly','Active','CPCM SEEDED A',:'a_email') returning id::text as a_plan \gset
insert into public.payments_ledger(account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,notes,created_by_email)
values (:'a_account'::uuid,current_date,11.11,'Payment','Test','Completed','CPCM-A-SEEDED','CPCM SEEDED A',:'a_email') returning id::text as a_ledger \gset
insert into public.account_docs(account_id,doc_type,document_type,file_name,debtor_name,created_by_email)
values (:'a_account'::uuid,'test','test','CPCM-SEEDED-A.pdf','CPCM SEEDED A',:'a_email') returning id::text as a_doc \gset
reset role;

select set_config('request.jwt.claims',json_build_object('sub',:'b_user','role','authenticated','email',:'b_email')::text,true);
set local role authenticated;
insert into public.payment_plans(account_id,total_amount,starting_balance,remaining_amount,frequency,status,notes,created_by_email)
values (:'b_account'::uuid,222.22,222.22,222.22,'Monthly','Active','CPCM SEEDED B',:'b_email') returning id::text as b_plan \gset
insert into public.payments_ledger(account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,notes,created_by_email)
values (:'b_account'::uuid,current_date,22.22,'Payment','Test','Completed','CPCM-B-SEEDED','CPCM SEEDED B',:'b_email') returning id::text as b_ledger \gset
insert into public.account_docs(account_id,doc_type,document_type,file_name,debtor_name,created_by_email)
values (:'b_account'::uuid,'test','test','CPCM-SEEDED-B.pdf','CPCM SEEDED B',:'b_email') returning id::text as b_doc \gset
reset role;

select set_config('cpcm.test_a_plan',:'a_plan',true); select set_config('cpcm.test_b_plan',:'b_plan',true);
select set_config('cpcm.test_a_ledger',:'a_ledger',true); select set_config('cpcm.test_b_ledger',:'b_ledger',true);
select set_config('cpcm.test_a_doc',:'a_doc',true); select set_config('cpcm.test_b_doc',:'b_doc',true);
-- Agency A: own synthetic rows must be visible; Agency B rows must be invisible.
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $test$
DECLARE n int;
BEGIN
  select count(*) into n from public.payment_plans where id=current_setting('cpcm.test_a_plan')::uuid; if n<>1 then raise exception 'FAIL: Agency A cannot see own payment_plan'; end if;
  select count(*) into n from public.payment_plans where id=current_setting('cpcm.test_b_plan')::uuid; if n<>0 then raise exception 'FAIL: Agency A can see Agency B payment_plan'; end if;
  select count(*) into n from public.payments_ledger where id=current_setting('cpcm.test_a_ledger')::uuid; if n<>1 then raise exception 'FAIL: Agency A cannot see own ledger row'; end if;
  select count(*) into n from public.payments_ledger where id=current_setting('cpcm.test_b_ledger')::uuid; if n<>0 then raise exception 'FAIL: Agency A can see Agency B ledger row'; end if;
  select count(*) into n from public.account_docs where id=current_setting('cpcm.test_a_doc')::uuid; if n<>1 then raise exception 'FAIL: Agency A cannot see own account_doc'; end if;
  select count(*) into n from public.account_docs where id=current_setting('cpcm.test_b_doc')::uuid; if n<>0 then raise exception 'FAIL: Agency A can see Agency B account_doc'; end if;
  raise notice 'PASS: Agency A seeded financial/document isolation';
END $test$;

-- Agency B reciprocal proof.
select set_config('request.jwt.claims',json_build_object('sub',:'b_user','role','authenticated','email',:'b_email')::text,true);
DO $test$
DECLARE n int;
BEGIN
  select count(*) into n from public.payment_plans where id=current_setting('cpcm.test_b_plan')::uuid; if n<>1 then raise exception 'FAIL: Agency B cannot see own payment_plan'; end if;
  select count(*) into n from public.payment_plans where id=current_setting('cpcm.test_a_plan')::uuid; if n<>0 then raise exception 'FAIL: Agency B can see Agency A payment_plan'; end if;
  select count(*) into n from public.payments_ledger where id=current_setting('cpcm.test_b_ledger')::uuid; if n<>1 then raise exception 'FAIL: Agency B cannot see own ledger row'; end if;
  select count(*) into n from public.payments_ledger where id=current_setting('cpcm.test_a_ledger')::uuid; if n<>0 then raise exception 'FAIL: Agency B can see Agency A ledger row'; end if;
  select count(*) into n from public.account_docs where id=current_setting('cpcm.test_b_doc')::uuid; if n<>1 then raise exception 'FAIL: Agency B cannot see own account_doc'; end if;
  select count(*) into n from public.account_docs where id=current_setting('cpcm.test_a_doc')::uuid; if n<>0 then raise exception 'FAIL: Agency B can see Agency A account_doc'; end if;
  raise notice 'PASS: Agency B reciprocal seeded financial/document isolation';
END $test$;

reset role;
select set_config('request.jwt.claims','{}',true);
ROLLBACK;
\echo 'DEMO SEEDED FINANCIAL/DOCUMENT ISOLATION TEST PASSED; all synthetic rows rolled back.'