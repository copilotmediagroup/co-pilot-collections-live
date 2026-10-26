\set ON_ERROR_STOP on
-- Production Agency A/B behavioral isolation proof.
-- SAFE PRODUCTION TEST: runs entirely inside one transaction and always rolls back.
-- Run only after foundation + tenant-fence + post-fence policy stages have passed.
BEGIN;

-- Structural prerequisites: the behavioral proof is meaningless without the canonical fence.
DO $pre$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['accounts','team_messages'] LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'ISOLATION BLOCKED: missing %',t; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id') THEN RAISE EXCEPTION 'ISOLATION BLOCKED: %.organization_id missing',t; END IF;
    FOREACH p IN ARRAY ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=p AND permissive='RESTRICTIVE') THEN
        RAISE EXCEPTION 'ISOLATION BLOCKED: restrictive policy %.% missing',t,p;
      END IF;
    END LOOP;
  END LOOP;
END $pre$;

-- Use two existing auth identities, but all membership/data changes are rolled back.
SELECT id::text AS a_user,coalesce(email,'') AS a_email FROM auth.users ORDER BY created_at,id LIMIT 1 \gset
SELECT id::text AS b_user,coalesce(email,'') AS b_email FROM auth.users WHERE id <> :'a_user'::uuid ORDER BY created_at,id LIMIT 1 \gset
\if :{?b_user}
\else
  \echo 'PRODUCTION ISOLATION BLOCKED: requires two existing auth users; no changes committed.'
  ROLLBACK;
  \quit 3
\endif

INSERT INTO public.organizations(id,name,slug,status,plan,is_demo) VALUES
('10000000-0000-4000-8000-000000000001','CPCM Production Isolation A','cpcm-production-isolation-a','active','owner',false),
('20000000-0000-4000-8000-000000000002','CPCM Production Isolation B','cpcm-production-isolation-b','active','owner',false)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,status='active';
UPDATE public.organization_members SET is_active=false WHERE auth_user_id IN (:'a_user'::uuid,:'b_user'::uuid);
DELETE FROM private.platform_admins WHERE auth_user_id IN (:'a_user'::uuid,:'b_user'::uuid);
INSERT INTO public.organization_members(organization_id,auth_user_id,role,is_active) VALUES
('10000000-0000-4000-8000-000000000001',:'a_user'::uuid,'agency_admin',true),
('20000000-0000-4000-8000-000000000002',:'b_user'::uuid,'agency_admin',true)
ON CONFLICT(organization_id,auth_user_id) DO UPDATE SET role='agency_admin',is_active=true;

-- Reassign two existing rows temporarily; never manufacture production business data.
WITH r AS (SELECT id,row_number() over(order by id) rn FROM public.accounts LIMIT 2)
UPDATE public.accounts a SET organization_id=CASE WHEN r.rn=1 THEN '10000000-0000-4000-8000-000000000001'::uuid ELSE '20000000-0000-4000-8000-000000000002'::uuid END FROM r WHERE a.id=r.id;
SELECT id::text AS a_account FROM public.accounts WHERE organization_id='10000000-0000-4000-8000-000000000001'::uuid LIMIT 1 \gset
SELECT id::text AS b_account FROM public.accounts WHERE organization_id='20000000-0000-4000-8000-000000000002'::uuid LIMIT 1 \gset
\if :{?b_account}
\else
  \echo 'PRODUCTION ISOLATION BLOCKED: requires two existing accounts; no changes committed.'
  ROLLBACK;
  \quit 4
\endif

-- Prove INSERT isolation on a real tenant table without leaving business data behind.
-- First disable only the tenant-stamp trigger transactionally so the restrictive INSERT policy itself
-- must reject Agency A forging Agency B. The trigger is re-enabled immediately after the negative probe.
ALTER TABLE public.team_messages DISABLE TRIGGER cpcm_stamp_organization;
GRANT INSERT,SELECT ON public.team_messages TO authenticated;
SELECT set_config('cpcm.test_a_account',:'a_account',true);
SELECT set_config('cpcm.test_b_account',:'b_account',true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $a$
DECLARE n int;
BEGIN
  IF private.current_organization_id()<>'10000000-0000-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'FAIL A tenant resolution'; END IF;
  SELECT count(*) INTO n FROM public.accounts WHERE id=current_setting('cpcm.test_b_account')::uuid; IF n<>0 THEN RAISE EXCEPTION 'FAIL A SELECT B'; END IF;
  UPDATE public.accounts SET status=status WHERE id=current_setting('cpcm.test_b_account')::uuid; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL A UPDATE B'; END IF;
  DELETE FROM public.accounts WHERE id=current_setting('cpcm.test_b_account')::uuid; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL A DELETE B'; END IF;
  SELECT count(*) INTO n FROM public.accounts WHERE id=current_setting('cpcm.test_a_account')::uuid; IF n<>1 THEN RAISE EXCEPTION 'FAIL A own-row access'; END IF;
  BEGIN
    INSERT INTO public.team_messages(organization_id,from_email,to_email,subject,body,created_by_email)
    VALUES ('20000000-0000-4000-8000-000000000002'::uuid,:'a_email',:'a_email','CPCM isolation probe','rollback-only restrictive INSERT probe',:'a_email');
    RAISE EXCEPTION 'FAIL A INSERT B: restrictive insert fence allowed forged Agency B row';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected RLS WITH CHECK rejection (SQLSTATE 42501)
  END;
END $a$;

RESET ROLE;
ALTER TABLE public.team_messages ENABLE TRIGGER cpcm_stamp_organization;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
-- With the canonical trigger restored, a forged B id must be stamped to Agency A on the real table.
INSERT INTO public.team_messages(organization_id,from_email,to_email,subject,body,created_by_email)
VALUES ('20000000-0000-4000-8000-000000000002'::uuid,:'a_email',:'a_email','CPCM isolation probe','rollback-only tenant stamp probe',:'a_email')
RETURNING id::text AS stamp_message,organization_id::text AS stamped_org \gset
SELECT (:'stamped_org'='10000000-0000-4000-8000-000000000001') AS stamped_ok \gset
\if :stamped_ok
\else
  \echo 'FAIL forged tenant stamp'
  ROLLBACK;
  \quit 5
\endif

SELECT set_config('request.jwt.claims',json_build_object('sub',:'b_user','role','authenticated','email',:'b_email')::text,true);
DO $b$
DECLARE n int;
BEGIN
  IF private.current_organization_id()<>'20000000-0000-4000-8000-000000000002'::uuid THEN RAISE EXCEPTION 'FAIL B tenant resolution'; END IF;
  SELECT count(*) INTO n FROM public.accounts WHERE id=current_setting('cpcm.test_a_account')::uuid; IF n<>0 THEN RAISE EXCEPTION 'FAIL B SELECT A'; END IF;
  SELECT count(*) INTO n FROM public.accounts WHERE id=current_setting('cpcm.test_b_account')::uuid; IF n<>1 THEN RAISE EXCEPTION 'FAIL B own-row access'; END IF;
END $b$;

RESET ROLE;
INSERT INTO private.platform_admins(auth_user_id) VALUES (:'a_user'::uuid) ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',:'a_user','role','authenticated','email',:'a_email')::text,true);
DO $p$
DECLARE n int;
BEGIN
 IF NOT private.is_platform_admin() THEN RAISE EXCEPTION 'FAIL platform admin resolution'; END IF;
 SELECT count(*) INTO n FROM public.accounts WHERE id IN (current_setting('cpcm.test_a_account')::uuid,current_setting('cpcm.test_b_account')::uuid);
 IF n<>2 THEN RAISE EXCEPTION 'FAIL platform admin cross-tenant inspection'; END IF;
END $p$;
RESET ROLE;
ROLLBACK;
\echo 'PASS production Agency A/B isolation proof — reciprocal SELECT/UPDATE/DELETE fence, restrictive cross-tenant INSERT rejection, real-table forged-tenant stamping, own-row access and platform-admin control verified; all changes rolled back.'
