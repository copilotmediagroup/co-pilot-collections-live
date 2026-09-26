create table if not exists public.job_applications (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (char_length(full_name) between 2 and 120),
 phone text not null check (char_length(phone) between 7 and 40),
 email text not null check (char_length(email) between 5 and 180),
 city text not null check (char_length(city) between 2 and 120),
 years_experience numeric(5,1) not null check (years_experience between 0 and 50),
 preferred_shift text not null check (preferred_shift in ('Day — 9:00 AM–4:00 PM','Evening — 2:00 PM–10:00 PM')),
 average_monthly_collections numeric(12,2) not null default 0 check (average_monthly_collections>=0),
 best_month_collections numeric(12,2) not null default 0 check (best_month_collections>=0),
 debt_types text not null check (char_length(debt_types)<=500),
 ready_monday boolean not null default false,
 equipment_ready boolean not null default false,
 applicant_notes text check (char_length(applicant_notes)<=2000),
 status text not null default 'new' check (status in ('new','reviewing','interview','hired','rejected')),
 reviewed_at timestamptz,
 reviewed_by_email text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.job_applications enable row level security;
revoke all on public.job_applications from public;
grant insert on public.job_applications to anon, authenticated;
grant select, update on public.job_applications to authenticated;
drop policy if exists job_applications_public_insert on public.job_applications;
create policy job_applications_public_insert on public.job_applications for insert to anon, authenticated with check (status='new' and reviewed_at is null and reviewed_by_email is null);
drop policy if exists job_applications_admin_select on public.job_applications;
create policy job_applications_admin_select on public.job_applications for select to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
drop policy if exists job_applications_admin_update on public.job_applications;
create policy job_applications_admin_update on public.job_applications for update to authenticated using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com') with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
create index if not exists job_applications_status_created_idx on public.job_applications(status,created_at desc);
