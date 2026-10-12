-- Co Pilot Collections — Recruiter Division V2 persistence
create table if not exists public.recruiter_candidate_profiles (
  application_id uuid primary key references public.job_applications(id) on delete cascade,
  recruiter_email text not null,
  communication smallint check (communication between 1 and 5),
  collection_knowledge smallint check (collection_knowledge between 1 and 5),
  negotiation smallint check (negotiation between 1 and 5),
  professionalism smallint check (professionalism between 1 and 5),
  remote_readiness smallint check (remote_readiness between 1 and 5),
  interview_notes text,
  source text default 'ReadyCollectGo',
  hired_at timestamptz,
  expected_start_date date,
  onboarding jsonb not null default '{"account_created":false,"email_verified":false,"agreement_signed":false,"training_complete":false,"compliance_ack":false,"dialer_ready":false,"headset_tested":false,"assessment_complete":false}'::jsonb,
  activated_at timestamptz,
  day7_at timestamptz,
  day30_at timestamptz,
  productive_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.recruiter_candidate_profiles enable row level security;
grant select,insert,update on public.recruiter_candidate_profiles to authenticated;
drop policy if exists recruiter_profiles_recruiter_all on public.recruiter_candidate_profiles;
create policy recruiter_profiles_recruiter_all on public.recruiter_candidate_profiles for all to authenticated
using (lower(recruiter_email)=lower(coalesce(auth.jwt()->>'email','')) and exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(u.role,''))='recruiter' and coalesce(u.is_approved,false) and coalesce(u.is_active,false)))
with check (lower(recruiter_email)=lower(coalesce(auth.jwt()->>'email','')) and exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(u.role,''))='recruiter' and coalesce(u.is_approved,false) and coalesce(u.is_active,false)));
drop policy if exists recruiter_profiles_admin_all on public.recruiter_candidate_profiles;
create policy recruiter_profiles_admin_all on public.recruiter_candidate_profiles for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create index if not exists recruiter_candidate_profiles_recruiter_idx on public.recruiter_candidate_profiles(lower(recruiter_email),updated_at desc);
notify pgrst,'reload schema';
