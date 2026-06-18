
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
