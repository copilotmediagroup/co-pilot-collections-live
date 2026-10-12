-- Co Pilot Collections — Recruiter Division V1
-- New recruiter permissions for the existing job application table.

alter table public.job_applications enable row level security;

drop policy if exists recruiter_read_job_applications on public.job_applications;
create policy recruiter_read_job_applications
on public.job_applications for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='recruiter'
      and coalesce(u.is_approved,false)=true
      and coalesce(u.is_active,false)=true
      and lower(coalesce(u.approval_status,''))='approved'
  )
);

drop policy if exists recruiter_update_job_applications on public.job_applications;
create policy recruiter_update_job_applications
on public.job_applications for update
to authenticated
using (
  exists (select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(u.role,''))='recruiter' and coalesce(u.is_approved,false)=true and coalesce(u.is_active,false)=true)
)
with check (
  exists (select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and lower(coalesce(u.role,''))='recruiter' and coalesce(u.is_approved,false)=true and coalesce(u.is_active,false)=true)
);

grant select,update on public.job_applications to authenticated;
notify pgrst,'reload schema';
