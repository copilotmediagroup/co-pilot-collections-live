begin;
do $$ begin
 if to_regclass('public.recruiter_applications') is not null then
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='recruiter_applications' and c.relrowsecurity) then raise exception 'PHASE34 BLOCKED: recruiter RLS disabled'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='recruiter_applications' and policyname='recruiter_applications_public_insert' and cmd='INSERT' and with_check ilike '%status%new%' and with_check ilike '%reviewed_at%IS NULL%') then raise exception 'PHASE34 BLOCKED: constrained public insert policy missing'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='recruiter_applications' and policyname='recruiter_applications_platform_select') then raise exception 'PHASE34 BLOCKED: platform review select policy missing'; end if;
 end if;
 raise notice 'PHASE34 RECRUITING PUBLIC INSERT GATE PASSED';
end $$;
rollback;
