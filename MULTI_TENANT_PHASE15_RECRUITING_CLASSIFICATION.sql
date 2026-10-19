-- Phase 15: recruiting is PLATFORM-GLOBAL in SaaS v1, not agency-owned.
-- Public applicants are applying to Co Pilot/Ready Collect Go itself; attaching anonymous submissions
-- to an agency through the legacy Ready Collect Go default would be unsafe and semantically wrong.
begin;

-- Undo Phase 1 ownership only if these columns were introduced by the multi-tenant draft.
-- Run this before production cutover; staging should verify no downstream FK/policy depends on them.
do $$ declare t text; begin
 foreach t in array array['job_applications','recruiter_applications','recruiter_candidate_profiles'] loop
  if to_regclass('public.'||t) is not null then
   execute format('drop trigger if exists cpcm_stamp_organization on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_select on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_insert on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_update on public.%I',t);
   execute format('drop policy if exists cpcm_tenant_delete on public.%I',t);
   if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='organization_id') then
    execute format('alter table public.%I drop column organization_id',t);
   end if;
  end if;
 end loop;
end $$;

-- Recruiter applications remain public INSERT-only; review is platform-admin-only.
drop policy if exists recruiter_applications_admin_select on public.recruiter_applications;
drop policy if exists recruiter_applications_admin_update on public.recruiter_applications;
create policy recruiter_applications_platform_select on public.recruiter_applications for select to authenticated using(private.is_platform_admin());
create policy recruiter_applications_platform_update on public.recruiter_applications for update to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin());

-- Job applications use the same platform-level review rule while preserving their existing public submission policy.
do $$ begin
 if to_regclass('public.job_applications') is not null then
  drop policy if exists job_applications_admin_select on public.job_applications;
  drop policy if exists job_applications_admin_update on public.job_applications;
  create policy job_applications_platform_select on public.job_applications for select to authenticated using(private.is_platform_admin());
  create policy job_applications_platform_update on public.job_applications for update to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin());
 end if;
end $$;
commit;
