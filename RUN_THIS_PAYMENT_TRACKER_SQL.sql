
-- PAYMENT PROMISE TRACKER SQL
-- Run this in Supabase SQL Editor. This does NOT process payments.

create extension if not exists pgcrypto;

create table if not exists public.payment_promises (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  promise_group_id text,
  schedule_index integer default 1,
  schedule_total integer default 1,
  debtor_name text,
  account_number text,
  payment_kind text default 'One-Time Payment',
  payment_amount numeric default 0,
  total_amount numeric default 0,
  due_date date,
  payment_method text,
  method_last4 text,
  authorization_method text,
  status text default 'Pending Processing',
  employee_email text,
  assigned_to_email text,
  created_by_email text,
  processed_by_email text,
  processed_at timestamptz,
  paid_date date,
  paid_amount numeric default 0,
  admin_note text,
  notes text,
  rescheduled_from date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.payment_promises
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists promise_group_id text,
  add column if not exists schedule_index integer default 1,
  add column if not exists schedule_total integer default 1,
  add column if not exists debtor_name text,
  add column if not exists account_number text,
  add column if not exists payment_kind text default 'One-Time Payment',
  add column if not exists payment_amount numeric default 0,
  add column if not exists total_amount numeric default 0,
  add column if not exists due_date date,
  add column if not exists payment_method text,
  add column if not exists method_last4 text,
  add column if not exists authorization_method text,
  add column if not exists status text default 'Pending Processing',
  add column if not exists employee_email text,
  add column if not exists assigned_to_email text,
  add column if not exists created_by_email text,
  add column if not exists processed_by_email text,
  add column if not exists processed_at timestamptz,
  add column if not exists paid_date date,
  add column if not exists paid_amount numeric default 0,
  add column if not exists admin_note text,
  add column if not exists notes text,
  add column if not exists rescheduled_from date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_payment_promises_account_id on public.payment_promises(account_id);
create index if not exists idx_payment_promises_due_date on public.payment_promises(due_date);
create index if not exists idx_payment_promises_status on public.payment_promises(status);
create index if not exists idx_payment_promises_employee_email on public.payment_promises(lower(coalesce(employee_email,'')));

alter table public.payment_promises enable row level security;

drop policy if exists payment_promises_select on public.payment_promises;
drop policy if exists payment_promises_insert on public.payment_promises;
drop policy if exists payment_promises_update on public.payment_promises;
drop policy if exists payment_promises_delete on public.payment_promises;

create policy payment_promises_select on public.payment_promises for select to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(employee_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or exists (select 1 from public.accounts a where a.id = account_id and lower(coalesce(a.assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
);

create policy payment_promises_insert on public.payment_promises for insert to authenticated with check (auth.role() = 'authenticated');

create policy payment_promises_update on public.payment_promises for update to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(employee_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
) with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(employee_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy payment_promises_delete on public.payment_promises for delete to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
);

notify pgrst, 'reload schema';
