create table if not exists public.recruiter_applications (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 phone text not null,
 email text not null,
 city text not null,
 recruiting_experience_years numeric(5,1) not null default 0,
 collections_experience_years numeric(5,1) not null default 0,
 hires_per_month integer not null default 0,
 interview_experience boolean not null default false,
 equipment_ready boolean not null default false,
 availability text not null,
 hiring_plan text not null,
 notes text,
 status text not null default 'new' check (status in ('new','reviewing','interview','approved','rejected')),
 reviewed_at timestamptz,
 reviewed_by_email text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.recruiter_applications enable row level security;
grant insert on public.recruiter_applications to anon, authenticated;
grant select, update on public.recruiter_applications to authenticated;
drop policy if exists recruiter_applications_public_insert on public.recruiter_applications;
create policy recruiter_applications_public_insert on public.recruiter_applications for insert to anon, authenticated with check (status='new' and reviewed_at is null and reviewed_by_email is null);
drop policy if exists recruiter_applications_admin_select on public.recruiter_applications;
create policy recruiter_applications_admin_select on public.recruiter_applications for select to authenticated using (exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and (lower(coalesce(u.role,''))='admin' or lower(u.email)='afinch2678@gmail.com') and coalesce(u.is_active,true)=true));
drop policy if exists recruiter_applications_admin_update on public.recruiter_applications;
create policy recruiter_applications_admin_update on public.recruiter_applications for update to authenticated using (exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and (lower(coalesce(u.role,''))='admin' or lower(u.email)='afinch2678@gmail.com') and coalesce(u.is_active,true)=true)) with check (exists(select 1 from public.app_users u where lower(u.email)=lower(coalesce(auth.jwt()->>'email','')) and (lower(coalesce(u.role,''))='admin' or lower(u.email)='afinch2678@gmail.com') and coalesce(u.is_active,true)=true));
notify pgrst,'reload schema';
