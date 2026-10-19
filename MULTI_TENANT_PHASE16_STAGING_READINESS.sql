-- Phase 16: staging readiness / fail-closed checks.
-- Read-only except for assertions. Run after Phases 1-15 in a NON-PRODUCTION project.
do $$ declare n bigint; begin
 select count(*) into n from public.organization_members where is_active group by auth_user_id having count(*)>1 limit 1;
 if n is not null then raise exception 'STAGING BLOCKED: a login has more than one active organization membership'; end if;
 if not exists(select 1 from pg_indexes where schemaname='public' and tablename='organization_members' and indexname='organization_members_one_active_org_per_user') then raise exception 'STAGING BLOCKED: one-active-org membership index missing'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('recruiter_applications','job_applications','recruiter_candidate_profiles') and column_name='organization_id') then raise exception 'STAGING BLOCKED: platform-global recruiting still has tenant ownership column'; end if;
 if to_regclass('public.recruiter_applications') is not null and not exists(select 1 from pg_policies where schemaname='public' and tablename='recruiter_applications' and policyname='recruiter_applications_platform_select') then raise exception 'STAGING BLOCKED: recruiter platform review policy missing'; end if;
 raise notice 'PHASE 16 READINESS CHECKS PASSED';
end $$;

-- Manual staging gate after this assertion passes:
-- 1. Agency A and Agency B each get exactly one login/membership.
-- 2. Run Phase 7 REST/JWT cross-tenant tests.
-- 3. Exercise client portal, payment approval/commission, remittance, AI, voice broadcast and RingCentral paths.
-- 4. Exercise anonymous recruiter submission and verify neither agency can read it; platform admin can.
-- 5. Only then execute Phase 8 to remove temporary legacy organization defaults.
