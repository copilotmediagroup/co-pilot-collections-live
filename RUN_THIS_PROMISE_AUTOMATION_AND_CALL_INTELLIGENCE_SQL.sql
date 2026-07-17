

-- ============================================================
-- PAYMENT PROMISE / PAYMENT PLAN / NOTES SAVE FIX
-- Co Pilot Collections Manager
-- Safe to run more than once.
-- Fixes schema-cache/table-column/RLS issues that can stop:
--   - Agent Notes
--   - Payment Plan Schedule
--   - Payment Promise / Pay Desk
-- ============================================================

create extension if not exists pgcrypto;

-- Notes table used by the main Save Note button.
create table if not exists public.account_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  note text,
  created_by_email text,
  created_at timestamptz default now()
);

alter table public.account_notes
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists note text,
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now();

-- Payment plan header table. Older versions had balance/payment_amount.
-- Newer UI saves starting_balance/remaining_amount. Keep both so old and new code work.
create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  total_amount numeric default 0,
  starting_balance numeric default 0,
  remaining_amount numeric default 0,
  balance numeric default 0,
  payment_amount numeric default 0,
  frequency text,
  start_date date,
  next_due_date date,
  status text default 'Active',
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.payment_plans
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists total_amount numeric default 0,
  add column if not exists starting_balance numeric default 0,
  add column if not exists remaining_amount numeric default 0,
  add column if not exists balance numeric default 0,
  add column if not exists payment_amount numeric default 0,
  add column if not exists frequency text,
  add column if not exists start_date date,
  add column if not exists next_due_date date,
  add column if not exists status text default 'Active',
  add column if not exists notes text,
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Payment plan line items. Older versions used payment_plan_id/amount/payment_amount/payment_date.
-- Newer UI uses plan_id/amount_due/amount_paid/paid_date. Keep both.
create table if not exists public.payment_plan_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.payment_plans(id) on delete cascade,
  payment_plan_id uuid references public.payment_plans(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  due_date date,
  scheduled_date date,
  amount_due numeric default 0,
  amount_paid numeric default 0,
  amount numeric default 0,
  payment_amount numeric default 0,
  paid_date date,
  payment_date date,
  paid_at timestamptz,
  status text default 'Scheduled',
  payment_method text,
  reference_number text,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.payment_plan_payments
  add column if not exists plan_id uuid references public.payment_plans(id) on delete cascade,
  add column if not exists payment_plan_id uuid references public.payment_plans(id) on delete cascade,
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists due_date date,
  add column if not exists scheduled_date date,
  add column if not exists amount_due numeric default 0,
  add column if not exists amount_paid numeric default 0,
  add column if not exists amount numeric default 0,
  add column if not exists payment_amount numeric default 0,
  add column if not exists paid_date date,
  add column if not exists payment_date date,
  add column if not exists paid_at timestamptz,
  add column if not exists status text default 'Scheduled',
  add column if not exists payment_method text,
  add column if not exists reference_number text,
  add column if not exists notes text,
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Manual Promise / Pay Desk table.
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

-- Backfill compatibility fields so dashboards read old/new rows the same way.
update public.payment_plans
set
  remaining_amount = coalesce(nullif(remaining_amount,0), balance, total_amount, 0),
  balance = coalesce(nullif(balance,0), remaining_amount, total_amount, 0),
  starting_balance = coalesce(nullif(starting_balance,0), total_amount, balance, remaining_amount, 0)
where true;

update public.payment_plan_payments
set
  plan_id = coalesce(plan_id, payment_plan_id),
  payment_plan_id = coalesce(payment_plan_id, plan_id),
  amount_due = coalesce(nullif(amount_due,0), amount, payment_amount, 0),
  amount = coalesce(nullif(amount,0), amount_due, payment_amount, 0),
  payment_amount = coalesce(nullif(payment_amount,0), amount_paid, amount_due, amount, 0),
  scheduled_date = coalesce(scheduled_date, due_date),
  due_date = coalesce(due_date, scheduled_date),
  paid_date = coalesce(paid_date, payment_date),
  payment_date = coalesce(payment_date, paid_date)
where true;

create index if not exists idx_account_notes_account_id_savefix on public.account_notes(account_id);
create index if not exists idx_account_notes_created_savefix on public.account_notes(created_at desc);
create index if not exists idx_payment_plans_account_id_savefix on public.payment_plans(account_id);
create index if not exists idx_payment_plans_status_savefix on public.payment_plans(status);
create index if not exists idx_payment_plan_payments_plan_id_savefix on public.payment_plan_payments(plan_id);
create index if not exists idx_payment_plan_payments_payment_plan_id_savefix on public.payment_plan_payments(payment_plan_id);
create index if not exists idx_payment_plan_payments_account_id_savefix on public.payment_plan_payments(account_id);
create index if not exists idx_payment_plan_payments_due_date_savefix on public.payment_plan_payments(due_date);
create index if not exists idx_payment_promises_account_id_savefix on public.payment_promises(account_id);
create index if not exists idx_payment_promises_due_date_savefix on public.payment_promises(due_date);
create index if not exists idx_payment_promises_status_savefix on public.payment_promises(status);

alter table public.account_notes enable row level security;
alter table public.payment_plans enable row level security;
alter table public.payment_plan_payments enable row level security;
alter table public.payment_promises enable row level security;

-- Remove older restrictive/duplicate policies for these save-critical tables.
drop policy if exists account_notes_access on public.account_notes;
drop policy if exists account_notes_access_secure on public.account_notes;
drop policy if exists account_notes_select_final on public.account_notes;
drop policy if exists account_notes_insert_final on public.account_notes;
drop policy if exists account_notes_update_admin_final on public.account_notes;
drop policy if exists account_notes_delete_admin_final on public.account_notes;
drop policy if exists account_notes_savefix_select on public.account_notes;
drop policy if exists account_notes_savefix_insert on public.account_notes;
drop policy if exists account_notes_savefix_update on public.account_notes;
drop policy if exists account_notes_savefix_delete on public.account_notes;

create policy account_notes_savefix_select on public.account_notes for select to authenticated using (auth.role() = 'authenticated');
create policy account_notes_savefix_insert on public.account_notes for insert to authenticated with check (auth.role() = 'authenticated');
create policy account_notes_savefix_update on public.account_notes for update to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy account_notes_savefix_delete on public.account_notes for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

drop policy if exists payment_plans_access on public.payment_plans;
drop policy if exists payment_plans_access_secure on public.payment_plans;
drop policy if exists payment_plans_select_final on public.payment_plans;
drop policy if exists payment_plans_insert_final on public.payment_plans;
drop policy if exists payment_plans_update_final on public.payment_plans;
drop policy if exists payment_plans_delete_admin_final on public.payment_plans;
drop policy if exists payment_plans_savefix_select on public.payment_plans;
drop policy if exists payment_plans_savefix_insert on public.payment_plans;
drop policy if exists payment_plans_savefix_update on public.payment_plans;
drop policy if exists payment_plans_savefix_delete on public.payment_plans;

create policy payment_plans_savefix_select on public.payment_plans for select to authenticated using (auth.role() = 'authenticated');
create policy payment_plans_savefix_insert on public.payment_plans for insert to authenticated with check (auth.role() = 'authenticated');
create policy payment_plans_savefix_update on public.payment_plans for update to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy payment_plans_savefix_delete on public.payment_plans for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

drop policy if exists payment_plan_payments_access on public.payment_plan_payments;
drop policy if exists payment_plan_payments_access_secure on public.payment_plan_payments;
drop policy if exists payment_plan_payments_select_final on public.payment_plan_payments;
drop policy if exists payment_plan_payments_insert_final on public.payment_plan_payments;
drop policy if exists payment_plan_payments_update_final on public.payment_plan_payments;
drop policy if exists payment_plan_payments_delete_admin_final on public.payment_plan_payments;
drop policy if exists payment_plan_payments_savefix_select on public.payment_plan_payments;
drop policy if exists payment_plan_payments_savefix_insert on public.payment_plan_payments;
drop policy if exists payment_plan_payments_savefix_update on public.payment_plan_payments;
drop policy if exists payment_plan_payments_savefix_delete on public.payment_plan_payments;

create policy payment_plan_payments_savefix_select on public.payment_plan_payments for select to authenticated using (auth.role() = 'authenticated');
create policy payment_plan_payments_savefix_insert on public.payment_plan_payments for insert to authenticated with check (auth.role() = 'authenticated');
create policy payment_plan_payments_savefix_update on public.payment_plan_payments for update to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy payment_plan_payments_savefix_delete on public.payment_plan_payments for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

drop policy if exists payment_promises_select on public.payment_promises;
drop policy if exists payment_promises_insert on public.payment_promises;
drop policy if exists payment_promises_update on public.payment_promises;
drop policy if exists payment_promises_delete on public.payment_promises;
drop policy if exists payment_promises_savefix_select on public.payment_promises;
drop policy if exists payment_promises_savefix_insert on public.payment_promises;
drop policy if exists payment_promises_savefix_update on public.payment_promises;
drop policy if exists payment_promises_savefix_delete on public.payment_promises;

create policy payment_promises_savefix_select on public.payment_promises for select to authenticated using (auth.role() = 'authenticated');
create policy payment_promises_savefix_insert on public.payment_promises for insert to authenticated with check (auth.role() = 'authenticated');
create policy payment_promises_savefix_update on public.payment_promises for update to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy payment_promises_savefix_delete on public.payment_promises for delete to authenticated using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

comment on table public.account_notes is 'Co Pilot save fix: notes table';
comment on table public.payment_plans is 'Co Pilot save fix: payment plan header table';
comment on table public.payment_plan_payments is 'Co Pilot save fix: payment plan schedule table';
comment on table public.payment_promises is 'Co Pilot save fix: payment promise/pay desk table';

notify pgrst, 'reload schema';

-- ============================================================
-- END PAYMENT PROMISE / PAYMENT PLAN / NOTES SAVE FIX
-- ============================================================



-- MISSING QA TABLES FIX
-- This creates the 3 tables that failed the QA report:
-- 1) public.payments_ledger
-- 2) public.account_docs
-- 3) public.call_results

create table if not exists public.payments_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  payment_plan_id uuid references public.payment_plans(id) on delete set null,
  amount numeric default 0,
  payment_amount numeric default 0,
  payment_date date,
  paid_at timestamptz,
  payment_method text,
  status text default 'Paid',
  reference_number text,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.account_docs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  doc_type text,
  document_type text,
  file_name text,
  debtor_name text,
  account_number text,
  authorized_by text default 'Co Pilot Collections Manager',
  body_template text,
  pdf_data jsonb default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.call_results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  phone_number text,
  call_result text,
  disposition text,
  notes text,
  result_at timestamptz default now(),
  created_by_email text,
  created_at timestamptz default now()
);

create index if not exists idx_payments_ledger_account_id on public.payments_ledger(account_id);
create index if not exists idx_payments_ledger_payment_plan_id on public.payments_ledger(payment_plan_id);
create index if not exists idx_payments_ledger_payment_date on public.payments_ledger(payment_date);
create index if not exists idx_account_docs_account_id on public.account_docs(account_id);
create index if not exists idx_account_docs_doc_type on public.account_docs(doc_type);
create index if not exists idx_call_results_account_id on public.call_results(account_id);
create index if not exists idx_call_results_result_at on public.call_results(result_at);

alter table public.payments_ledger enable row level security;
alter table public.account_docs enable row level security;
alter table public.call_results enable row level security;

drop policy if exists payments_ledger_select_authenticated on public.payments_ledger;
drop policy if exists payments_ledger_insert_authenticated on public.payments_ledger;
drop policy if exists payments_ledger_update_admin on public.payments_ledger;
drop policy if exists payments_ledger_delete_admin on public.payments_ledger;

drop policy if exists account_docs_select_authenticated on public.account_docs;
drop policy if exists account_docs_insert_authenticated on public.account_docs;
drop policy if exists account_docs_update_admin on public.account_docs;
drop policy if exists account_docs_delete_admin on public.account_docs;

drop policy if exists call_results_select_authenticated on public.call_results;
drop policy if exists call_results_insert_authenticated on public.call_results;
drop policy if exists call_results_update_admin on public.call_results;
drop policy if exists call_results_delete_admin on public.call_results;

create policy payments_ledger_select_authenticated
on public.payments_ledger for select
to authenticated
using (auth.role() = 'authenticated');

create policy payments_ledger_insert_authenticated
on public.payments_ledger for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy payments_ledger_update_admin
on public.payments_ledger for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy payments_ledger_delete_admin
on public.payments_ledger for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy account_docs_select_authenticated
on public.account_docs for select
to authenticated
using (auth.role() = 'authenticated');

create policy account_docs_insert_authenticated
on public.account_docs for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy account_docs_update_admin
on public.account_docs for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy account_docs_delete_admin
on public.account_docs for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy call_results_select_authenticated
on public.call_results for select
to authenticated
using (auth.role() = 'authenticated');

create policy call_results_insert_authenticated
on public.call_results for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy call_results_update_admin
on public.call_results for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy call_results_delete_admin
on public.call_results for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

-- Force Supabase/PostgREST schema cache refresh by touching comments.
comment on table public.payments_ledger is 'Payment ledger table for Co Pilot Collections Manager';
comment on table public.account_docs is 'Generated document record table for Co Pilot Collections Manager';
comment on table public.call_results is 'Call result log table for Co Pilot Collections Manager';

-- Co Pilot Collections Manager - Promise Automation + Collector Alerts
-- Run this in the matching Supabase project before using the Alerts dashboard.

create extension if not exists pgcrypto;

create table if not exists public.collector_alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  alert_type text not null default 'General',
  severity text not null default 'info',
  title text not null,
  message text,
  due_date date,
  status text not null default 'Open',
  assigned_to_email text,
  created_by_email text,
  source_table text,
  source_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_email text
);

alter table public.collector_alerts
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists alert_type text not null default 'General',
  add column if not exists severity text not null default 'info',
  add column if not exists title text not null default 'Collector Alert',
  add column if not exists message text,
  add column if not exists due_date date,
  add column if not exists status text not null default 'Open',
  add column if not exists assigned_to_email text,
  add column if not exists created_by_email text,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by_email text;

create index if not exists idx_collector_alerts_account_id on public.collector_alerts(account_id);
create index if not exists idx_collector_alerts_status_due on public.collector_alerts(status, due_date);
create index if not exists idx_collector_alerts_assigned on public.collector_alerts(lower(coalesce(assigned_to_email,'')));
create unique index if not exists idx_collector_alerts_unique_open_source on public.collector_alerts(alert_type, source_table, source_id) where status = 'Open' and source_id is not null and source_id <> '';

alter table public.collector_alerts enable row level security;

drop policy if exists collector_alerts_select on public.collector_alerts;
drop policy if exists collector_alerts_insert on public.collector_alerts;
drop policy if exists collector_alerts_update on public.collector_alerts;
drop policy if exists collector_alerts_delete on public.collector_alerts;

create policy collector_alerts_select on public.collector_alerts for select to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or exists (select 1 from public.accounts a where a.id = account_id and lower(coalesce(a.assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email','')))
);
create policy collector_alerts_insert on public.collector_alerts for insert to authenticated with check (auth.role() = 'authenticated');
create policy collector_alerts_update on public.collector_alerts for update to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
) with check (auth.role() = 'authenticated');
create policy collector_alerts_delete on public.collector_alerts for delete to authenticated using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com')
);

notify pgrst, 'reload schema';

-- Co Pilot Collections Manager - Call Logging + Contact Intelligence
-- Run this in the matching Supabase project before using the Call Intelligence dashboard.
-- Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.call_results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  phone_number text,
  call_result text,
  disposition text,
  notes text,
  result_at timestamptz default now(),
  created_by_email text,
  created_at timestamptz default now()
);

alter table public.call_results
  add column if not exists phone_number text,
  add column if not exists call_result text,
  add column if not exists disposition text,
  add column if not exists direction text default 'Outbound',
  add column if not exists outcome_category text,
  add column if not exists duration_seconds integer default 0,
  add column if not exists answered_by text,
  add column if not exists is_contact boolean default false,
  add column if not exists is_rpc boolean default false,
  add column if not exists is_promise boolean default false,
  add column if not exists is_callback boolean default false,
  add column if not exists is_wrong_number boolean default false,
  add column if not exists next_call_at timestamptz,
  add column if not exists account_balance_snapshot numeric default 0,
  add column if not exists call_source text default 'Co Pilot CRM',
  add column if not exists notes text,
  add column if not exists result_at timestamptz default now(),
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now();

alter table public.accounts
  add column if not exists last_called_at timestamptz,
  add column if not exists last_call_result text,
  add column if not exists last_call_outcome text,
  add column if not exists next_call_at timestamptz,
  add column if not exists call_count integer default 0,
  add column if not exists contact_count integer default 0,
  add column if not exists rpc_count integer default 0,
  add column if not exists voicemail_count integer default 0,
  add column if not exists no_answer_count integer default 0,
  add column if not exists wrong_number_count integer default 0,
  add column if not exists refused_count integer default 0;

create index if not exists idx_call_results_account_id on public.call_results(account_id);
create index if not exists idx_call_results_created_at on public.call_results(created_at desc);
create index if not exists idx_call_results_created_by on public.call_results(lower(coalesce(created_by_email,'')));
create index if not exists idx_call_results_call_result on public.call_results(call_result);
create index if not exists idx_call_results_next_call_at on public.call_results(next_call_at);
create index if not exists idx_accounts_next_call_at on public.accounts(next_call_at);
create index if not exists idx_accounts_last_called_at on public.accounts(last_called_at);

alter table public.call_results enable row level security;

drop policy if exists call_results_select_authenticated on public.call_results;
drop policy if exists call_results_insert_authenticated on public.call_results;
drop policy if exists call_results_update_admin on public.call_results;
drop policy if exists call_results_delete_admin on public.call_results;

create policy call_results_select_authenticated
on public.call_results for select
to authenticated
using (
  auth.role() = 'authenticated'
);

create policy call_results_insert_authenticated
on public.call_results for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy call_results_update_admin
on public.call_results for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

create policy call_results_delete_admin
on public.call_results for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com'));

comment on table public.call_results is 'Call logging and contact intelligence for Co Pilot Collections Manager';
notify pgrst, 'reload schema';
