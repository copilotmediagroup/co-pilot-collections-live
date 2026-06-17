
-- FOLLOW UPS SAVE FIX
-- Run this if Save Follow-Up does not save or gives a table/policy/permission error.

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  follow_up_type text default 'Callback',
  due_date date,
  due_time text,
  status text default 'Open',
  assigned_to_email text,
  reason text,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.follow_ups enable row level security;

create index if not exists idx_follow_ups_due on public.follow_ups(due_date, status);
create index if not exists idx_follow_ups_assigned on public.follow_ups(lower(assigned_to_email));
create index if not exists idx_follow_ups_account on public.follow_ups(account_id);

drop policy if exists follow_ups_access_secure on public.follow_ups;
drop policy if exists "follow_ups_access" on public.follow_ups;
drop policy if exists follow_ups_select_approved on public.follow_ups;
drop policy if exists follow_ups_insert_approved on public.follow_ups;
drop policy if exists follow_ups_update_approved on public.follow_ups;
drop policy if exists follow_ups_delete_admin on public.follow_ups;

create policy follow_ups_select_approved
on public.follow_ups for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1 from public.accounts a
    where a.id = follow_ups.account_id
    and lower(coalesce(a.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  )
);

create policy follow_ups_insert_approved
on public.follow_ups for insert
to authenticated
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1 from public.accounts a
    where a.id = account_id
    and lower(coalesce(a.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  )
);

create policy follow_ups_update_approved
on public.follow_ups for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
);

create policy follow_ups_delete_admin
on public.follow_ups for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');
