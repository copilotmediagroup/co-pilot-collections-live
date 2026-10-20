\set ON_ERROR_STOP on
BEGIN;
-- Extended DEMO gate. Rolls back every test mutation.
select id::text a_user,coalesce(email,'') a_email from auth.users order by created_at,id limit 1 \gset
select id::text b_user,coalesce(email,'') b_email from auth.users where id<>:'a_user'::uuid order by created_at,id limit 1 \gset
insert into public.organizations(id,name,slug,status,plan,is_demo) values
('10000000-0000-4000-8000-000000000001','Agency A Extended Test','agency-a-extended-test','active','test',true),
('20000000-0000-4000-8000-000000000002','Agency B Extended Test','agency-b-extended-test','active','test',true)
on conflict(id) do update set name=excluded.name,is_demo=true;
update public.organization_members set is_active=false where auth_user_id in (:'a_user'::uuid,:'b_user'::uuid);
delete from private.platform_admins where auth_user_id in (:'a_user'::uuid,:'b_user'::uuid);
insert into public.organization_members(organization_id,auth_user_id,role,is_active) values
('10000000-0000-4000-8000-000000000001',:'a_user'::uuid,'agency_admin',true),
('20000000-0000-4000-8000-000000000002',:'b_user'::uuid,'agency_admin',true)
on conflict(organization_id,auth_user_id) do update set role='agency_admin',is_active=true;

-- Move representative existing DEMO rows into opposite tenants only for this transaction.
DO $$ DECLARE t text; ids uuid[]; BEGIN
 FOREACH t IN ARRAY ARRAY['accounts','payment_plans','payments_ledger','account_docs','team_messages'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('select array_agg(id) from (select id from public.%I order by id limit 2) s',t) INTO ids;
   IF coalesce(array_length(ids,1),0)>=2 THEN
    EXECUTE format('update public.%I set organization_id=$1 where id=$2',t) USING '10000000-0000-4000-8000-000000000001'::uuid,ids[1];
    EXECUTE format('update public.%I set organization_id=$1 where id=$2',t) USING '20000000-0000-4000-8000-000000000002'::uuid,ids[2];
   END IF;
  END IF;
 END LOOP;
END $$;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $$ DECLARE t text; n int; total int; BEGIN
 FOREACH t IN ARRAY ARRAY['accounts','payment_plans','payments_ledger','account_docs','team_messages'] LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('select count(*) from public.%I where organization_id=$1',t) INTO total USING '20000000-0000-4000-8000-000000000002'::uuid;
   IF total<>0 THEN RAISE EXCEPTION 'FAIL: Agency A can see Agency B rows in %',t; END IF;
   EXECUTE format('select count(*) from public.%I where organization_id=$1',t) INTO n USING '10000000-0000-4000-8000-000000000001'::uuid;
   RAISE NOTICE 'PASS: Agency A tenant fence on % (own visible rows=%)',t,n;
  END IF;
 END LOOP;
END $$;
reset role;
select set_config('request.jwt.claims','{}',true);
ROLLBACK;
\echo 'DEMO EXTENDED ISOLATION TEST PASSED; representative account/payment/document/message reads fenced and rolled back.'
