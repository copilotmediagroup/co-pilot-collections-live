\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$
DECLARE t text;
BEGIN
  IF to_regclass('public.recruiter_applications') IS NULL THEN RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: recruiter_applications missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recruiter_applications' AND policyname='recruiter_applications_public_insert') THEN RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: public insert policy missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recruiter_applications' AND policyname='recruiter_applications_platform_select') THEN RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: platform select policy missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='recruiter_applications' AND policyname='recruiter_applications_platform_update') THEN RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: platform update policy missing'; END IF;
  FOREACH t IN ARRAY ARRAY['recruiter_applications','job_applications','recruiter_candidate_profiles'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='organization_id') THEN
      RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: %.organization_id still exists',t;
    END IF;
    IF to_regclass('public.'||t) IS NOT NULL AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname LIKE 'cpcm_tenant_%') THEN
      RAISE EXCEPTION 'RECRUITING POST-CUTOVER BLOCKED: tenant fence remains on platform-global table %',t;
    END IF;
  END LOOP;
  RAISE NOTICE 'RECRUITING POST-CUTOVER PASSED: recruiting is platform-global and review is platform-admin controlled.';
END $$;
ROLLBACK;
\echo 'RECRUITING POST-CUTOVER GATE PASSED.'
