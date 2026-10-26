\set ON_ERROR_STOP on
-- Read-only LIVE compatibility proof for the platform-global recruiting cutover.
-- Run only after the production foundation exists and before Phase 15.
BEGIN READ ONLY;
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regprocedure('private.is_platform_admin()') IS NULL THEN missing:=array_append(missing,'private.is_platform_admin()'); END IF;
  IF to_regclass('public.recruiter_applications') IS NULL THEN
    missing:=array_append(missing,'recruiter_applications');
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recruiter_applications' AND column_name='status') THEN missing:=array_append(missing,'recruiter_applications.status'); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recruiter_applications' AND column_name='reviewed_at') THEN missing:=array_append(missing,'recruiter_applications.reviewed_at'); END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recruiter_applications' AND column_name='reviewed_by_email') THEN missing:=array_append(missing,'recruiter_applications.reviewed_by_email'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recruiter_applications' AND policyname='recruiter_applications_public_insert') THEN missing:=array_append(missing,'recruiter_applications_public_insert'); END IF;
  END IF;
  IF to_regclass('public.job_applications') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='job_applications' AND policyname='job_applications_public_insert'
  ) THEN missing:=array_append(missing,'job_applications_public_insert'); END IF;
  IF to_regclass('public.recruiter_candidate_profiles') IS NOT NULL AND to_regclass('public.job_applications') IS NULL THEN
    missing:=array_append(missing,'candidate_profiles_without_job_applications');
  END IF;
  IF cardinality(missing)>0 THEN RAISE EXCEPTION 'RECRUITING CUTOVER BLOCKED: %',array_to_string(missing,', '); END IF;
  RAISE NOTICE 'RECRUITING COMPATIBILITY PASSED: Phase 15 prerequisites are present.';
END $$;
ROLLBACK;
\echo 'RECRUITING PRE-CUTOVER COMPATIBILITY PASSED.'
