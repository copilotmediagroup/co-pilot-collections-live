\set ON_ERROR_STOP on
DO $$
DECLARE missing text[]:=ARRAY[]::text[];
BEGIN
 IF to_regclass('public.organizations') IS NULL THEN missing:=array_append(missing,'organizations'); END IF;
 IF to_regclass('public.organization_members') IS NULL THEN missing:=array_append(missing,'organization_members'); END IF;
 IF to_regclass('private.platform_admins') IS NULL THEN missing:=array_append(missing,'private.platform_admins'); END IF;
 IF to_regprocedure('private.current_organization_id()') IS NULL THEN missing:=array_append(missing,'private.current_organization_id'); END IF;
 IF to_regprocedure('private.is_platform_admin()') IS NULL THEN missing:=array_append(missing,'private.is_platform_admin'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id='00000000-0000-4000-8000-000000000001'::uuid) THEN missing:=array_append(missing,'legacy organization seed'); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='organization_members' AND indexname='organization_members_one_active_org_per_user') THEN missing:=array_append(missing,'one-active-org index'); END IF;
 IF cardinality(missing)>0 THEN RAISE EXCEPTION 'DEMO CHECKPOINT INVALID: %',array_to_string(missing,', '); END IF;
 RAISE NOTICE 'DEMO CHECKPOINT VERIFIED: Phase 1 + Phase 3 + Phase 4 prerequisites present';
END $$;
