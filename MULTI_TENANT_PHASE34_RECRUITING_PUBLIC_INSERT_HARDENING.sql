-- Phase 34: preserve platform-global recruiting while explicitly constraining anonymous submission.
begin;
do $$ begin
 if to_regclass('public.recruiter_applications') is not null then
  alter table public.recruiter_applications enable row level security;
  drop policy if exists recruiter_applications_public_insert on public.recruiter_applications;
  create policy recruiter_applications_public_insert on public.recruiter_applications
    for insert to anon,authenticated
    with check (status='new' and reviewed_at is null and reviewed_by_email is null);
 end if;
end $$;
commit;
