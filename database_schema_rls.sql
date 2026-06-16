-- Co Pilot Collections Manager - Supabase Browser Version Schema
-- Run this in Supabase -> SQL Editor.
-- This version uses Supabase URL + publishable key in the browser.
-- No service role key is needed.

create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),

  portfolio text,
  account_description text,
  client_account_number text,
  source_account_id text,
  account_number text,

  first_name text,
  middle_name text,
  last_name text,
  full_name text,

  ssn text,
  dob text,

  address text,
  address2 text,
  city text,
  state text,
  zip text,

  employer text,
  email text,

  original_creditor text,
  type_of_debt text,

  original_balance numeric,
  principal numeric,
  current_balance numeric,

  open_date text,
  date_account_opened text,
  delinquency_date text,
  charge_off_date text,
  orig_last_pmt_date text,
  last_payment_date text,
  last_payment_amount numeric,

  bank_routing_number text,
  bank_account_number text,

  phone1 text,
  phone2 text,
  phone3 text,
  phone4 text,
  phone5 text,
  phone6 text,

  status text default 'New',
  disposition text,
  last_contact_number text,

  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_accounts_status on accounts(status);
create index if not exists idx_accounts_portfolio on accounts(portfolio);
create index if not exists idx_accounts_account_number on accounts(account_number);
create index if not exists idx_accounts_full_name on accounts(full_name);

create table if not exists account_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  note text not null,
  created_by_email text,
  created_at timestamptz default now()
);

create index if not exists idx_account_notes_account on account_notes(account_id);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  action_type text not null,
  action_text text,
  phone_number text,
  old_status text,
  new_status text,
  created_by_email text,
  created_at timestamptz default now()
);

create index if not exists idx_activity_logs_account on activity_logs(account_id);

alter table accounts enable row level security;
alter table account_notes enable row level security;
alter table activity_logs enable row level security;

drop policy if exists "accounts_select_authenticated" on accounts;
drop policy if exists "accounts_insert_admin" on accounts;
drop policy if exists "accounts_update_authenticated" on accounts;
drop policy if exists "accounts_delete_admin" on accounts;

create policy "accounts_select_authenticated"
on accounts for select
to authenticated
using (true);

create policy "accounts_insert_admin"
on accounts for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy "accounts_update_authenticated"
on accounts for update
to authenticated
using (true)
with check (true);

create policy "accounts_delete_admin"
on accounts for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

drop policy if exists "notes_select_authenticated" on account_notes;
drop policy if exists "notes_insert_authenticated" on account_notes;

create policy "notes_select_authenticated"
on account_notes for select
to authenticated
using (true);

create policy "notes_insert_authenticated"
on account_notes for insert
to authenticated
with check (true);

drop policy if exists "activity_select_authenticated" on activity_logs;
drop policy if exists "activity_insert_authenticated" on activity_logs;

create policy "activity_select_authenticated"
on activity_logs for select
to authenticated
using (true);

create policy "activity_insert_authenticated"
on activity_logs for insert
to authenticated
with check (true);


-- DELETE POLICY FIX FOR CLEAR/REUPLOAD TESTING
-- This allows the logged-in app to clear bad imports from the admin UI.
-- Upload/download buttons are still hidden for employees in the app UI.

drop policy if exists "accounts_delete_admin" on accounts;
drop policy if exists "accounts_delete_authenticated" on accounts;

create policy "accounts_delete_authenticated"
on accounts for delete
to authenticated
using (true);

drop policy if exists "notes_delete_authenticated" on account_notes;

create policy "notes_delete_authenticated"
on account_notes for delete
to authenticated
using (true);

drop policy if exists "activity_delete_authenticated" on activity_logs;

create policy "activity_delete_authenticated"
on activity_logs for delete
to authenticated
using (true);


-- FULL PDL MANUAL MAPPING EXTENSION
alter table accounts add column if not exists issuer_name text;
alter table accounts add column if not exists occupation text;
alter table accounts add column if not exists description text;
alter table accounts add column if not exists account_receive_date text;
alter table accounts add column if not exists orig_employer text;
alter table accounts add column if not exists orig_store_name text;
alter table accounts add column if not exists orig_store_city text;
alter table accounts add column if not exists orig_store_state text;
alter table accounts add column if not exists orig_bank_name text;
alter table accounts add column if not exists orig_bank_acct_last4_digits text;
alter table accounts add column if not exists orig_principal_balance numeric;
alter table accounts add column if not exists orig_original_loan_amount numeric;
alter table accounts add column if not exists orig_chargeoff_balance numeric;
alter table accounts add column if not exists orig_loan_type text;
alter table accounts add column if not exists orig_principal_loan_amount numeric;
alter table accounts add column if not exists orig_interest_amount numeric;
alter table accounts add column if not exists orig_return_fee numeric;
alter table accounts add column if not exists phone1_type text;
alter table accounts add column if not exists phone1_line_type text;
alter table accounts add column if not exists phone1_source text;
alter table accounts add column if not exists phone1_note text;
alter table accounts add column if not exists phone1_status text;
alter table accounts add column if not exists phone2_type text;
alter table accounts add column if not exists phone2_line_type text;
alter table accounts add column if not exists phone2_source text;
alter table accounts add column if not exists phone2_note text;
alter table accounts add column if not exists phone2_status text;
alter table accounts add column if not exists phone3_type text;
alter table accounts add column if not exists phone3_line_type text;
alter table accounts add column if not exists phone3_source text;
alter table accounts add column if not exists phone3_note text;
alter table accounts add column if not exists phone3_status text;
alter table accounts add column if not exists phone4_type text;
alter table accounts add column if not exists phone4_line_type text;
alter table accounts add column if not exists phone4_source text;
alter table accounts add column if not exists phone4_note text;
alter table accounts add column if not exists phone4_status text;
alter table accounts add column if not exists phone5_type text;
alter table accounts add column if not exists phone5_line_type text;
alter table accounts add column if not exists phone5_source text;
alter table accounts add column if not exists phone5_note text;
alter table accounts add column if not exists phone5_status text;
alter table accounts add column if not exists phone6_type text;
alter table accounts add column if not exists phone6_line_type text;
alter table accounts add column if not exists phone6_source text;
alter table accounts add column if not exists phone6_note text;
alter table accounts add column if not exists phone6_status text;
alter table accounts add column if not exists phone7 text;
alter table accounts add column if not exists phone7_type text;
alter table accounts add column if not exists phone7_line_type text;
alter table accounts add column if not exists phone7_source text;
alter table accounts add column if not exists phone7_note text;
alter table accounts add column if not exists phone7_status text;
alter table accounts add column if not exists phone8 text;
alter table accounts add column if not exists phone8_type text;
alter table accounts add column if not exists phone8_line_type text;
alter table accounts add column if not exists phone8_source text;
alter table accounts add column if not exists phone8_note text;
alter table accounts add column if not exists phone8_status text;
alter table accounts add column if not exists phone9 text;
alter table accounts add column if not exists phone9_type text;
alter table accounts add column if not exists phone9_line_type text;
alter table accounts add column if not exists phone9_source text;
alter table accounts add column if not exists phone9_note text;
alter table accounts add column if not exists phone9_status text;
alter table accounts add column if not exists phone10 text;
alter table accounts add column if not exists phone10_type text;
alter table accounts add column if not exists phone10_line_type text;
alter table accounts add column if not exists phone10_source text;
alter table accounts add column if not exists phone10_note text;
alter table accounts add column if not exists phone10_status text;
alter table accounts add column if not exists raw_data jsonb;


-- MAPPED FIELDS DISPLAY PROGRESS FIX
-- Ensures raw_data exists so the app can display every uploaded/source row field.
alter table accounts add column if not exists raw_data jsonb;


-- VISIBLE ALL FIELDS PANEL FIX V2
-- These columns must exist for mapped store/bank/phone fields to save as real columns.
-- raw_data also preserves the entire original uploaded row.
alter table accounts add column if not exists raw_data jsonb;
alter table accounts add column if not exists issuer_name text;
alter table accounts add column if not exists occupation text;
alter table accounts add column if not exists description text;
alter table accounts add column if not exists account_receive_date text;
alter table accounts add column if not exists orig_employer text;
alter table accounts add column if not exists orig_store_name text;
alter table accounts add column if not exists orig_store_city text;
alter table accounts add column if not exists orig_store_state text;
alter table accounts add column if not exists orig_bank_name text;
alter table accounts add column if not exists orig_bank_acct_last4_digits text;
alter table accounts add column if not exists orig_principal_balance numeric;
alter table accounts add column if not exists orig_original_loan_amount numeric;
alter table accounts add column if not exists orig_chargeoff_balance numeric;
alter table accounts add column if not exists orig_loan_type text;
alter table accounts add column if not exists orig_principal_loan_amount numeric;
alter table accounts add column if not exists orig_interest_amount numeric;
alter table accounts add column if not exists orig_return_fee numeric;
alter table accounts add column if not exists phone7 text;
alter table accounts add column if not exists phone8 text;
alter table accounts add column if not exists phone9 text;
alter table accounts add column if not exists phone10 text;


-- PAYMENT PLAN QUICK ACTIONS
create extension if not exists pgcrypto;

create table if not exists payment_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  total_amount numeric default 0,
  starting_balance numeric default 0,
  remaining_amount numeric default 0,
  frequency text default 'Custom',
  status text default 'Active',
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payment_plan_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references payment_plans(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  due_date date,
  amount_due numeric default 0,
  amount_paid numeric default 0,
  paid_date date,
  status text default 'Scheduled',
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table payment_plans enable row level security;
alter table payment_plan_payments enable row level security;

drop policy if exists "payment_plans_select_authenticated" on payment_plans;
drop policy if exists "payment_plans_insert_authenticated" on payment_plans;
drop policy if exists "payment_plans_update_authenticated" on payment_plans;
drop policy if exists "payment_plans_delete_authenticated" on payment_plans;

create policy "payment_plans_select_authenticated" on payment_plans for select to authenticated using (true);
create policy "payment_plans_insert_authenticated" on payment_plans for insert to authenticated with check (true);
create policy "payment_plans_update_authenticated" on payment_plans for update to authenticated using (true) with check (true);
create policy "payment_plans_delete_authenticated" on payment_plans for delete to authenticated using (true);

drop policy if exists "payment_plan_payments_select_authenticated" on payment_plan_payments;
drop policy if exists "payment_plan_payments_insert_authenticated" on payment_plan_payments;
drop policy if exists "payment_plan_payments_update_authenticated" on payment_plan_payments;
drop policy if exists "payment_plan_payments_delete_authenticated" on payment_plan_payments;

create policy "payment_plan_payments_select_authenticated" on payment_plan_payments for select to authenticated using (true);
create policy "payment_plan_payments_insert_authenticated" on payment_plan_payments for insert to authenticated with check (true);
create policy "payment_plan_payments_update_authenticated" on payment_plan_payments for update to authenticated using (true) with check (true);
create policy "payment_plan_payments_delete_authenticated" on payment_plan_payments for delete to authenticated using (true);
