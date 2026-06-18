
-- HARD DEMO ADMIN ROLE FIX
-- Run this in DEMO Supabase SQL Editor.

-- Make sure app_users has correct roles.
insert into public.app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
values
  ('demo-admin@copilotdemo.com','admin','approved',true,true,now(),now(),now()),
  ('demo-employee@copilotdemo.com','employee','approved',true,true,now(),now(),now())
on conflict (email) do update
set role=excluded.role,
    approval_status='approved',
    is_approved=true,
    is_active=true,
    updated_at=now(),
    last_seen_at=now();

-- Show the exact rows after fixing.
select email, role, approval_status, is_approved, is_active
from public.app_users
where email in ('demo-admin@copilotdemo.com','demo-employee@copilotdemo.com')
order by email;

notify pgrst, 'reload schema';
