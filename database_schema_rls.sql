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


-- SMART ACCOUNT ASSIGNMENT
alter table accounts add column if not exists assigned_to_email text;
alter table accounts add column if not exists assigned_by_email text;
alter table accounts add column if not exists assigned_at timestamptz;
alter table accounts add column if not exists assignment_method text;
alter table accounts add column if not exists assignment_group_id uuid;

create index if not exists idx_accounts_assigned_to_email on accounts(lower(assigned_to_email));
create index if not exists idx_accounts_assignment_group_id on accounts(assignment_group_id);
create index if not exists idx_accounts_state_city_balance on accounts(state, city, current_balance);

-- Tighten account visibility:
-- Admin sees all accounts. Employees only see accounts assigned to their email.
drop policy if exists "accounts_select_authenticated" on accounts;
drop policy if exists "accounts_update_authenticated" on accounts;

create policy "accounts_select_authenticated"
on accounts for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
);

create policy "accounts_update_authenticated"
on accounts for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
);


-- EMPLOYEE DROPDOWN / APP USERS
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text default 'employee',
  full_name text,
  is_active boolean default true,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table app_users enable row level security;

drop policy if exists "app_users_select_admin_or_self" on app_users;
drop policy if exists "app_users_insert_self" on app_users;
drop policy if exists "app_users_update_admin_or_self" on app_users;

create policy "app_users_select_admin_or_self"
on app_users for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "app_users_insert_self"
on app_users for insert
to authenticated
with check (
  lower(email) = lower(auth.jwt() ->> 'email')
  or lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
);

create policy "app_users_update_admin_or_self"
on app_users for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

-- Pull existing Supabase Auth users into the dropdown table.
-- This runs only when you execute this SQL in Supabase SQL Editor.
insert into app_users (email, role, created_at, last_seen_at)
select lower(email),
       case when lower(email) = 'afinch2678@gmail.com' then 'admin' else 'employee' end,
       now(),
       now()
from auth.users
where email is not null
on conflict (email) do update
set role = case when excluded.email = 'afinch2678@gmail.com' then 'admin' else app_users.role end,
    last_seen_at = now();

create index if not exists idx_app_users_email on app_users(lower(email));
create index if not exists idx_app_users_role_active on app_users(role, is_active);


-- EMPLOYEE APPROVAL WORKFLOW
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text default 'employee',
  full_name text,
  approval_status text default 'pending',
  is_approved boolean default false,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table app_users add column if not exists approval_status text default 'pending';
alter table app_users add column if not exists is_approved boolean default false;
alter table app_users add column if not exists is_active boolean default false;
alter table app_users add column if not exists updated_at timestamptz default now();

alter table app_users enable row level security;

drop policy if exists "app_users_select_admin_or_self" on app_users;
drop policy if exists "app_users_insert_self" on app_users;
drop policy if exists "app_users_update_admin_or_self" on app_users;
drop policy if exists "app_users_select_admin_or_self_approval" on app_users;
drop policy if exists "app_users_insert_self_approval" on app_users;
drop policy if exists "app_users_update_admin_or_self_approval" on app_users;

create policy "app_users_select_admin_or_self_approval"
on app_users for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "app_users_insert_self_approval"
on app_users for insert
to authenticated
with check (
  lower(email) = lower(auth.jwt() ->> 'email')
  or lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
);

create policy "app_users_update_admin_or_self_approval"
on app_users for update
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

-- Existing Supabase Auth users appear in Manage Employees.
-- Admin is auto-approved. Everyone else is pending until admin approves.
insert into app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
select lower(email),
       case when lower(email) = 'afinch2678@gmail.com' then 'admin' else 'employee' end,
       case when lower(email) = 'afinch2678@gmail.com' then 'approved' else 'pending' end,
       case when lower(email) = 'afinch2678@gmail.com' then true else false end,
       case when lower(email) = 'afinch2678@gmail.com' then true else false end,
       now(),
       now(),
       now()
from auth.users
where email is not null
on conflict (email) do update
set role = case when excluded.email = 'afinch2678@gmail.com' then 'admin' else app_users.role end,
    approval_status = case when excluded.email = 'afinch2678@gmail.com' then 'approved' else coalesce(app_users.approval_status,'pending') end,
    is_approved = case when excluded.email = 'afinch2678@gmail.com' then true else coalesce(app_users.is_approved,false) end,
    is_active = case when excluded.email = 'afinch2678@gmail.com' then true else coalesce(app_users.is_active,false) end,
    updated_at = now();

create index if not exists idx_app_users_email on app_users(lower(email));
create index if not exists idx_app_users_approval on app_users(approval_status, is_approved, is_active);


-- Safety: keep employees locked until approved.
update app_users
set approval_status = coalesce(approval_status,'pending'),
    is_approved = case when lower(email) = 'afinch2678@gmail.com' then true else coalesce(is_approved,false) end,
    is_active = case when lower(email) = 'afinch2678@gmail.com' then true else (coalesce(is_approved,false) and coalesce(is_active,false)) end
where true;


-- LOGIN + EMPLOYEE APPROVAL SECURITY FIX
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text default 'employee',
  full_name text,
  approval_status text default 'pending',
  is_approved boolean default false,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table app_users add column if not exists role text default 'employee';
alter table app_users add column if not exists full_name text;
alter table app_users add column if not exists approval_status text default 'pending';
alter table app_users add column if not exists is_approved boolean default false;
alter table app_users add column if not exists is_active boolean default false;
alter table app_users add column if not exists created_at timestamptz default now();
alter table app_users add column if not exists updated_at timestamptz default now();
alter table app_users add column if not exists last_seen_at timestamptz default now();

alter table app_users enable row level security;

drop policy if exists "app_users_select_admin_or_self" on app_users;
drop policy if exists "app_users_insert_self" on app_users;
drop policy if exists "app_users_update_admin_or_self" on app_users;
drop policy if exists "app_users_select_admin_or_self_approval" on app_users;
drop policy if exists "app_users_insert_self_approval" on app_users;
drop policy if exists "app_users_update_admin_or_self_approval" on app_users;
drop policy if exists "app_users_select_login_fix" on app_users;
drop policy if exists "app_users_insert_self_pending_login_fix" on app_users;
drop policy if exists "app_users_update_admin_only_login_fix" on app_users;

create policy "app_users_select_login_fix"
on app_users for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "app_users_insert_self_pending_login_fix"
on app_users for insert
to authenticated
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or (
    lower(email) = lower(auth.jwt() ->> 'email')
    and coalesce(role,'employee') = 'employee'
    and coalesce(approval_status,'pending') = 'pending'
    and coalesce(is_approved,false) = false
    and coalesce(is_active,false) = false
  )
);

create policy "app_users_update_admin_only_login_fix"
on app_users for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

-- Sync existing Supabase Auth users into app_users.
insert into app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
select lower(email),
       case when lower(email) = 'afinch2678@gmail.com' then 'admin' else 'employee' end,
       case when lower(email) = 'afinch2678@gmail.com' then 'approved' else 'pending' end,
       case when lower(email) = 'afinch2678@gmail.com' then true else false end,
       case when lower(email) = 'afinch2678@gmail.com' then true else false end,
       now(),
       now(),
       now()
from auth.users
where email is not null
on conflict (email) do nothing;

-- Force admin approved.
update app_users
set role='admin', approval_status='approved', is_approved=true, is_active=true, updated_at=now()
where lower(email)='afinch2678@gmail.com';

-- Employees stay blocked unless admin approves them.
update app_users
set approval_status=coalesce(approval_status,'pending'),
    is_approved=case when approval_status='approved' then true else false end,
    is_active=case when approval_status='approved' then coalesce(is_active,true) else false end,
    updated_at=now()
where lower(email)<>'afinch2678@gmail.com';

create index if not exists idx_app_users_email on app_users(lower(email));
create index if not exists idx_app_users_approval on app_users(approval_status, is_approved, is_active);


-- ADMIN EMPLOYEE MONITOR INDEXES
create index if not exists idx_activity_logs_created_by_email on activity_logs(lower(created_by_email));
create index if not exists idx_activity_logs_action_type on activity_logs(action_type);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at);
create index if not exists idx_account_notes_created_by_email on account_notes(lower(created_by_email));
create index if not exists idx_account_notes_created_at on account_notes(created_at);
create index if not exists idx_payment_plans_created_by_email on payment_plans(lower(created_by_email));
create index if not exists idx_payment_plans_created_at on payment_plans(created_at);


-- FIRED / REMOVED EMPLOYEE WORKFLOW
alter table app_users add column if not exists removed_at timestamptz;
alter table app_users add column if not exists removed_by_email text;
alter table app_users add column if not exists removal_reason text;

create index if not exists idx_app_users_removed_at on app_users(removed_at);
create index if not exists idx_app_users_removed_by_email on app_users(lower(removed_by_email));

-- Make sure removed/fired employees cannot access the app.
update app_users
set is_approved=false,
    is_active=false,
    updated_at=now()
where approval_status='removed'
  and lower(email) <> 'afinch2678@gmail.com';


-- COLLECTIONS POWER FEATURES: callbacks, calls, disputes, docs, settlements, audit, permissions, import batches
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
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

create table if not exists call_results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  phone_number text,
  call_result text,
  duration_seconds integer default 0,
  notes text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  dispute_reason text,
  received_date date,
  status text default 'Open',
  proof_requested boolean default false,
  account_frozen boolean default true,
  follow_up_date date,
  docs_needed text,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  balance numeric default 0,
  settlement_percent numeric default 0,
  settlement_amount numeric default 0,
  due_date date,
  payment_type text,
  manager_approval_required boolean default false,
  status text default 'Offered',
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists account_docs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  doc_title text,
  doc_type text,
  doc_url text,
  notes text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text,
  action_text text,
  target_type text,
  target_id text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text,
  permission_key text,
  is_enabled boolean default false,
  updated_by_email text,
  updated_at timestamptz default now(),
  unique(role, permission_key)
);

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  portfolio text,
  imported_by_email text,
  imported_count integer default 0,
  skipped_count integer default 0,
  failed_count integer default 0,
  headers jsonb,
  mapping jsonb,
  created_at timestamptz default now()
);

alter table follow_ups enable row level security;
alter table call_results enable row level security;
alter table disputes enable row level security;
alter table settlements enable row level security;
alter table account_docs enable row level security;
alter table audit_logs enable row level security;
alter table role_permissions enable row level security;
alter table import_batches enable row level security;

drop policy if exists "follow_ups_access" on follow_ups;
drop policy if exists "call_results_access" on call_results;
drop policy if exists "disputes_access" on disputes;
drop policy if exists "settlements_access" on settlements;
drop policy if exists "account_docs_access" on account_docs;
drop policy if exists "audit_logs_admin" on audit_logs;
drop policy if exists "role_permissions_admin" on role_permissions;
drop policy if exists "import_batches_admin" on import_batches;

create policy "follow_ups_access" on follow_ups for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email') or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email'))
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(assigned_to_email,'')) = lower(auth.jwt() ->> 'email') or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email'));

create policy "call_results_access" on call_results for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = call_results.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')))
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = call_results.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')));

create policy "disputes_access" on disputes for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = disputes.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')))
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = disputes.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')));

create policy "settlements_access" on settlements for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = settlements.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')))
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = settlements.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')));

create policy "account_docs_access" on account_docs for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = account_docs.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')))
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email') or exists (select 1 from accounts where accounts.id = account_docs.account_id and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')));

create policy "audit_logs_admin" on audit_logs for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com' or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email'));

create policy "role_permissions_admin" on role_permissions for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy "import_batches_admin" on import_batches for all to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create index if not exists idx_follow_ups_due on follow_ups(due_date, status);
create index if not exists idx_follow_ups_assigned on follow_ups(lower(assigned_to_email));
create index if not exists idx_call_results_account on call_results(account_id, created_at);
create index if not exists idx_disputes_account on disputes(account_id, status);
create index if not exists idx_settlements_account on settlements(account_id, created_at);
create index if not exists idx_account_docs_account on account_docs(account_id, created_at);
create index if not exists idx_audit_logs_created on audit_logs(created_at);
create index if not exists idx_audit_logs_user on audit_logs(lower(created_by_email));

insert into role_permissions(role, permission_key, is_enabled)
values
('admin','can_import',true),('admin','can_export',true),('admin','can_see_ssn',true),('admin','can_see_bank',true),('admin','can_assign',true),('admin','can_remove_employees',true),('admin','can_view_reports',true),('admin','can_edit_payment_plans',true),('admin','can_clear_accounts',true),
('collector','can_import',false),('collector','can_export',false),('collector','can_see_ssn',true),('collector','can_see_bank',true),('collector','can_assign',false),('collector','can_remove_employees',false),('collector','can_view_reports',false),('collector','can_edit_payment_plans',true),('collector','can_clear_accounts',false),
('manager','can_import',false),('manager','can_export',false),('manager','can_see_ssn',true),('manager','can_see_bank',true),('manager','can_assign',true),('manager','can_remove_employees',false),('manager','can_view_reports',true),('manager','can_edit_payment_plans',true),('manager','can_clear_accounts',false)
on conflict(role, permission_key) do nothing;


-- PAYMENT LEDGER + BROKEN PROMISE AUTOMATION

create table if not exists payments_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  payment_date date default current_date,
  amount numeric default 0,
  payment_type text default 'Payment',
  payment_method text,
  status text default 'Completed',
  receipt_number text,
  balance_before numeric default 0,
  balance_after numeric default 0,
  plan_payment_id uuid,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table payments_ledger enable row level security;

drop policy if exists "payments_ledger_access" on payments_ledger;

create policy "payments_ledger_access" on payments_ledger for all to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1 from accounts
    where accounts.id = payments_ledger.account_id
      and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com'
  or lower(coalesce(created_by_email,'')) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1 from accounts
    where accounts.id = payments_ledger.account_id
      and lower(coalesce(accounts.assigned_to_email,'')) = lower(auth.jwt() ->> 'email')
  )
);

create index if not exists idx_payments_ledger_account on payments_ledger(account_id, payment_date desc);
create index if not exists idx_payments_ledger_date on payments_ledger(payment_date desc);
create index if not exists idx_payments_ledger_user on payments_ledger(lower(created_by_email));
create index if not exists idx_payments_ledger_status on payments_ledger(status);
create index if not exists idx_payment_plan_payments_due_status on payment_plan_payments(due_date, status);


-- PDF DOCUMENT GENERATOR SUPPORT
-- Uses account_docs table from the Power Features pack.
alter table account_docs add column if not exists generated_file_name text;
alter table account_docs add column if not exists generated_doc_type text;
alter table account_docs add column if not exists generated_by_email text;
alter table account_docs add column if not exists generated_at timestamptz;

create index if not exists idx_account_docs_generated on account_docs(account_id, generated_at);


-- DEBTOR DOCUMENT TEMPLATE GENERATOR SUPPORT
alter table account_docs add column if not exists generated_file_name text;
alter table account_docs add column if not exists generated_doc_type text;
alter table account_docs add column if not exists generated_by_email text;
alter table account_docs add column if not exists generated_at timestamptz;

create index if not exists idx_account_docs_generated on account_docs(account_id, generated_at);


-- COMPANY LOGO SETTINGS FOR LETTERS
create table if not exists company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

alter table company_settings enable row level security;

drop policy if exists "company_settings_select_authenticated" on company_settings;
drop policy if exists "company_settings_admin_insert" on company_settings;
drop policy if exists "company_settings_admin_update" on company_settings;
drop policy if exists "company_settings_admin_delete" on company_settings;

create policy "company_settings_select_authenticated"
on company_settings for select
to authenticated
using (true);

create policy "company_settings_admin_insert"
on company_settings for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy "company_settings_admin_update"
on company_settings for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy "company_settings_admin_delete"
on company_settings for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create index if not exists idx_company_settings_updated_at on company_settings(updated_at);


-- CO PILOT COLLECTIONS MANAGER
-- RLS SECURITY / PUBLISH FIX
-- Run this in Supabase SQL Editor.
-- Purpose: remove "RLS Policy Always True" warnings by replacing true/unrestricted policies
-- with admin/approved-user/account-assignment based policies.

-- 1) Make sure approval columns exist.
alter table public.app_users add column if not exists role text default 'employee';
alter table public.app_users add column if not exists approval_status text default 'pending';
alter table public.app_users add column if not exists is_approved boolean default false;
alter table public.app_users add column if not exists is_active boolean default false;
alter table public.app_users add column if not exists updated_at timestamptz default now();

alter table public.accounts add column if not exists assigned_to_email text;
alter table public.accounts add column if not exists assigned_by_email text;
alter table public.accounts add column if not exists assigned_at timestamptz;
alter table public.accounts add column if not exists assignment_method text;

-- 2) Helper functions used by RLS policies.
create or replace function public.current_app_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_email() = 'afinch2678@gmail.com';
$$;

create or replace function public.is_approved_app_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_app_admin()
     or exists (
       select 1
       from public.app_users u
       where lower(u.email) = public.current_app_email()
         and coalesce(u.is_approved,false) = true
         and coalesce(u.is_active,false) = true
         and lower(coalesce(u.approval_status,'pending')) = 'approved'
     );
$$;

create or replace function public.can_access_account(p_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_app_admin()
     or exists (
       select 1
       from public.accounts a
       where a.id = p_account_id
         and public.is_approved_app_user()
         and lower(coalesce(a.assigned_to_email,'')) = public.current_app_email()
     );
$$;

grant execute on function public.current_app_email() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_approved_app_user() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;

-- 3) Ensure RLS is enabled.
alter table public.accounts enable row level security;
alter table public.account_notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_users enable row level security;
alter table public.payment_plans enable row level security;
alter table public.payment_plan_payments enable row level security;
alter table public.payments_ledger enable row level security;
alter table public.follow_ups enable row level security;
alter table public.call_results enable row level security;
alter table public.disputes enable row level security;
alter table public.settlements enable row level security;
alter table public.account_docs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.role_permissions enable row level security;
alter table public.import_batches enable row level security;
alter table public.company_settings enable row level security;

-- 4) Drop old policies, including "always true" policies.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'accounts','account_notes','activity_logs','app_users','payment_plans','payment_plan_payments',
        'payments_ledger','follow_ups','call_results','disputes','settlements','account_docs',
        'audit_logs','role_permissions','import_batches','company_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 5) app_users: admin can manage everyone; employee can insert/view self while pending.
create policy app_users_select_admin_or_self_secure
on public.app_users for select
to authenticated
using (
  public.is_app_admin()
  or lower(email) = public.current_app_email()
);

create policy app_users_insert_self_pending_secure
on public.app_users for insert
to authenticated
with check (
  public.is_app_admin()
  or (
    lower(email) = public.current_app_email()
    and coalesce(role,'employee') = 'employee'
    and coalesce(approval_status,'pending') = 'pending'
    and coalesce(is_approved,false) = false
    and coalesce(is_active,false) = false
  )
);

create policy app_users_update_admin_secure
on public.app_users for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy app_users_delete_admin_secure
on public.app_users for delete
to authenticated
using (public.is_app_admin());

-- 6) accounts: admin sees/manages all; employees only see/update assigned accounts.
create policy accounts_select_admin_or_assigned_secure
on public.accounts for select
to authenticated
using (
  public.is_app_admin()
  or (
    public.is_approved_app_user()
    and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
  )
);

create policy accounts_insert_admin_secure
on public.accounts for insert
to authenticated
with check (public.is_app_admin());

create policy accounts_update_admin_or_assigned_secure
on public.accounts for update
to authenticated
using (
  public.is_app_admin()
  or (
    public.is_approved_app_user()
    and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
  )
)
with check (
  public.is_app_admin()
  or (
    public.is_approved_app_user()
    and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
  )
);

create policy accounts_delete_admin_secure
on public.accounts for delete
to authenticated
using (public.is_app_admin());

-- 7) Account-child tables: admin all; employees only assigned account rows.
create policy account_notes_access_secure
on public.account_notes for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy activity_logs_access_secure
on public.activity_logs for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy payment_plans_access_secure
on public.payment_plans for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy payment_plan_payments_access_secure
on public.payment_plan_payments for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy payments_ledger_access_secure
on public.payments_ledger for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy call_results_access_secure
on public.call_results for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy disputes_access_secure
on public.disputes for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy settlements_access_secure
on public.settlements for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

create policy account_docs_access_secure
on public.account_docs for all
to authenticated
using (public.can_access_account(account_id))
with check (public.can_access_account(account_id));

-- Follow-ups can be accessed through assigned account OR assigned follow-up.
create policy follow_ups_access_secure
on public.follow_ups for all
to authenticated
using (
  public.is_app_admin()
  or public.can_access_account(account_id)
  or (
    public.is_approved_app_user()
    and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
  )
  or (
    public.is_approved_app_user()
    and lower(coalesce(created_by_email,'')) = public.current_app_email()
  )
)
with check (
  public.is_app_admin()
  or public.can_access_account(account_id)
  or (
    public.is_approved_app_user()
    and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
  )
  or (
    public.is_approved_app_user()
    and lower(coalesce(created_by_email,'')) = public.current_app_email()
  )
);

-- 8) Admin/dashboard tables.
create policy audit_logs_admin_secure
on public.audit_logs for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy role_permissions_select_approved_secure
on public.role_permissions for select
to authenticated
using (public.is_approved_app_user());

create policy role_permissions_modify_admin_secure
on public.role_permissions for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy import_batches_admin_secure
on public.import_batches for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

-- 9) Company logo/settings: all approved users can read; admin can change.
create policy company_settings_select_approved_secure
on public.company_settings for select
to authenticated
using (public.is_approved_app_user());

create policy company_settings_insert_admin_secure
on public.company_settings for insert
to authenticated
with check (public.is_app_admin());

create policy company_settings_update_admin_secure
on public.company_settings for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy company_settings_delete_admin_secure
on public.company_settings for delete
to authenticated
using (public.is_app_admin());

-- 10) Make sure your admin user is approved.
insert into public.app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
values ('afinch2678@gmail.com','admin','approved',true,true,now(),now(),now())
on conflict (email) do update
set role='admin', approval_status='approved', is_approved=true, is_active=true, updated_at=now(), last_seen_at=now();



-- CLEAR ACCOUNTS SECURE RPC FIX
-- Run this in Supabase SQL Editor.
-- It creates a secure admin-only function that clears account data without long browser DELETE URLs.

create or replace function public.admin_clear_accounts()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  c_payment_plan_payments int := 0;
  c_payment_plans int := 0;
  c_payments_ledger int := 0;
  c_account_docs int := 0;
  c_account_notes int := 0;
  c_activity_logs int := 0;
  c_follow_ups int := 0;
  c_call_results int := 0;
  c_disputes int := 0;
  c_settlements int := 0;
  c_import_batches int := 0;
  c_accounts int := 0;
begin
  if v_email not in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') then
    raise exception 'Admin only';
  end if;

  delete from public.payment_plan_payments;
  get diagnostics c_payment_plan_payments = row_count;

  delete from public.payment_plans;
  get diagnostics c_payment_plans = row_count;

  delete from public.payments_ledger;
  get diagnostics c_payments_ledger = row_count;

  delete from public.account_docs;
  get diagnostics c_account_docs = row_count;

  delete from public.account_notes;
  get diagnostics c_account_notes = row_count;

  delete from public.activity_logs;
  get diagnostics c_activity_logs = row_count;

  delete from public.follow_ups;
  get diagnostics c_follow_ups = row_count;

  delete from public.call_results;
  get diagnostics c_call_results = row_count;

  delete from public.disputes;
  get diagnostics c_disputes = row_count;

  delete from public.settlements;
  get diagnostics c_settlements = row_count;

  delete from public.import_batches;
  get diagnostics c_import_batches = row_count;

  delete from public.accounts;
  get diagnostics c_accounts = row_count;

  return json_build_object(
    'ok', true,
    'counts', json_build_object(
      'accounts', c_accounts,
      'account_notes', c_account_notes,
      'activity_logs', c_activity_logs,
      'payment_plans', c_payment_plans,
      'payment_plan_payments', c_payment_plan_payments,
      'payments_ledger', c_payments_ledger,
      'account_docs', c_account_docs,
      'follow_ups', c_follow_ups,
      'call_results', c_call_results,
      'disputes', c_disputes,
      'settlements', c_settlements,
      'import_batches', c_import_batches
    )
  );
end;
$$;

revoke all on function public.admin_clear_accounts() from public;
grant execute on function public.admin_clear_accounts() to authenticated;





-- PHONE-FIRST SEARCH SUPPORT INDEXES
-- Optional helper indexes for future server-side search.
create index if not exists idx_accounts_phone1 on public.accounts(phone1);
create index if not exists idx_accounts_phone2 on public.accounts(phone2);
create index if not exists idx_accounts_phone3 on public.accounts(phone3);
create index if not exists idx_accounts_phone4 on public.accounts(phone4);
create index if not exists idx_accounts_phone5 on public.accounts(phone5);
create index if not exists idx_accounts_ssn on public.accounts(ssn);
create index if not exists idx_accounts_account_number on public.accounts(account_number);
create index if not exists idx_accounts_full_name on public.accounts(full_name);



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




-- APP BRANDING SETTINGS
-- Run this if the Branding Settings modal cannot save to Supabase.

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select_authenticated on public.company_settings;
drop policy if exists company_settings_admin_insert on public.company_settings;
drop policy if exists company_settings_admin_update on public.company_settings;
drop policy if exists company_settings_admin_delete on public.company_settings;

create policy company_settings_select_authenticated
on public.company_settings for select
to authenticated
using (auth.role() = 'authenticated');

create policy company_settings_admin_insert
on public.company_settings for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_update
on public.company_settings for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_delete
on public.company_settings for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

insert into public.company_settings(setting_key, setting_value, updated_by_email)
values
  ('app_brand_name','Co Pilot Collections Manager','system'),
  ('app_brand_subtitle','Private Collections CRM','system')
on conflict (setting_key) do nothing;




-- LETTER SETTINGS: AUTHORIZED BY DEFAULT + EDITABLE LETTER BODY TEMPLATES
-- Run this if the letter settings cannot save to Supabase.

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select_authenticated on public.company_settings;
drop policy if exists company_settings_admin_insert on public.company_settings;
drop policy if exists company_settings_admin_update on public.company_settings;
drop policy if exists company_settings_admin_delete on public.company_settings;

create policy company_settings_select_authenticated
on public.company_settings for select
to authenticated
using (auth.role() = 'authenticated');

create policy company_settings_admin_insert
on public.company_settings for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_update
on public.company_settings for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_delete
on public.company_settings for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

insert into public.company_settings(setting_key, setting_value, updated_by_email)
values
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system'),
  ('pdf_letter_templates_json','{}','system')
on conflict (setting_key) do nothing;




-- FORCE LETTER SETTINGS FIX
-- Run this in Supabase SQL Editor if Authorized By still shows your email or letter body templates will not save.

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select_authenticated on public.company_settings;
drop policy if exists company_settings_admin_insert on public.company_settings;
drop policy if exists company_settings_admin_update on public.company_settings;
drop policy if exists company_settings_admin_delete on public.company_settings;

create policy company_settings_select_authenticated
on public.company_settings for select
to authenticated
using (auth.role() = 'authenticated');

create policy company_settings_admin_insert
on public.company_settings for insert
to authenticated
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_update
on public.company_settings for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

create policy company_settings_admin_delete
on public.company_settings for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'afinch2678@gmail.com');

insert into public.company_settings(setting_key, setting_value, updated_by_email, updated_at)
values
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system',now()),
  ('pdf_letter_templates_json','{}','system',now())
on conflict (setting_key) do nothing;

-- Repair older broken setting where Authorized By was saved as the admin email.
update public.company_settings
set setting_value='Co Pilot Collections Manager',
    updated_by_email='system',
    updated_at=now()
where setting_key='pdf_authorized_by_default'
  and (
    setting_value is null
    or trim(setting_value) = ''
    or setting_value like '%@%'
  );




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




-- FINAL SECURITY CLEANUP
-- Purpose:
-- 1) Remove old "RLS Policy Always True" warnings.
-- 2) Replace broad authenticated policies with admin/approved-user/assigned-account policies.
-- 3) Recreate admin_clear_accounts() as SECURITY INVOKER, not SECURITY DEFINER.
-- 4) Revoke public/anon execution on the clear function.
-- 5) Create missing QA tables if they do not exist.

create extension if not exists pgcrypto;

-- Required columns
alter table if exists public.app_users add column if not exists role text default 'employee';
alter table if exists public.app_users add column if not exists approval_status text default 'pending';
alter table if exists public.app_users add column if not exists is_approved boolean default false;
alter table if exists public.app_users add column if not exists is_active boolean default false;
alter table if exists public.app_users add column if not exists updated_at timestamptz default now();
alter table if exists public.app_users add column if not exists last_seen_at timestamptz;

alter table if exists public.accounts add column if not exists assigned_to_email text;
alter table if exists public.accounts add column if not exists assigned_by_email text;
alter table if exists public.accounts add column if not exists assigned_at timestamptz;
alter table if exists public.accounts add column if not exists assignment_method text;

-- Missing QA tables / feature tables
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

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  dispute_reason text,
  received_date date,
  status text default 'Open',
  proof_requested boolean default false,
  account_frozen boolean default true,
  follow_up_date date,
  docs_needed text,
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  balance numeric default 0,
  settlement_percent numeric default 0,
  settlement_amount numeric default 0,
  due_date date,
  payment_type text,
  manager_approval_required boolean default false,
  status text default 'Offered',
  notes text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text,
  action_text text,
  target_type text,
  target_id text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text,
  permission_key text,
  is_enabled boolean default false,
  updated_by_email text,
  updated_at timestamptz default now(),
  unique(role, permission_key)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  portfolio text,
  imported_by_email text,
  imported_count integer default 0,
  skipped_count integer default 0,
  failed_count integer default 0,
  headers jsonb,
  mapping jsonb,
  created_at timestamptz default now()
);

create table if not exists public.company_settings (
  setting_key text primary key,
  setting_value text,
  updated_by_email text,
  updated_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_accounts_assigned_to_email on public.accounts(lower(coalesce(assigned_to_email,'')));
create index if not exists idx_accounts_status_security on public.accounts(status);
create index if not exists idx_account_notes_account_security on public.account_notes(account_id);
create index if not exists idx_activity_logs_account_security on public.activity_logs(account_id);
create index if not exists idx_payment_plans_account_security on public.payment_plans(account_id);
create index if not exists idx_payment_plan_payments_account_security on public.payment_plan_payments(account_id);
create index if not exists idx_payments_ledger_account_security on public.payments_ledger(account_id);
create index if not exists idx_account_docs_account_security on public.account_docs(account_id);
create index if not exists idx_call_results_account_security on public.call_results(account_id);
create index if not exists idx_follow_ups_account_security on public.follow_ups(account_id);
create index if not exists idx_follow_ups_assigned_security on public.follow_ups(lower(coalesce(assigned_to_email,'')));
create index if not exists idx_disputes_account_security on public.disputes(account_id);
create index if not exists idx_settlements_account_security on public.settlements(account_id);

-- Drop old policies on known app tables
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'accounts','account_notes','activity_logs','app_users',
        'payment_plans','payment_plan_payments','payments_ledger',
        'account_docs','call_results','follow_ups','disputes','settlements',
        'audit_logs','role_permissions','import_batches','company_settings'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Remove older SECURITY DEFINER helper functions if old policies depended on them.
drop function if exists public.can_access_account(uuid);
drop function if exists public.is_approved_app_user();
drop function if exists public.is_app_admin();
drop function if exists public.current_app_email();

-- Enable RLS
alter table public.accounts enable row level security;
alter table public.account_notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_users enable row level security;
alter table public.payment_plans enable row level security;
alter table public.payment_plan_payments enable row level security;
alter table public.payments_ledger enable row level security;
alter table public.account_docs enable row level security;
alter table public.call_results enable row level security;
alter table public.follow_ups enable row level security;
alter table public.disputes enable row level security;
alter table public.settlements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.role_permissions enable row level security;
alter table public.import_batches enable row level security;
alter table public.company_settings enable row level security;

-- Admin email used by this private install.
-- Replace this email for a different client/private install.
-- Admin expression repeated intentionally to avoid SECURITY DEFINER helper warnings.

-- app_users
create policy app_users_select_admin_or_self_final
on public.app_users for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy app_users_insert_self_pending_final
on public.app_users for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
    and lower(coalesce(role,'employee')) = 'employee'
    and lower(coalesce(approval_status,'pending')) = 'pending'
    and coalesce(is_approved,false) = false
    and coalesce(is_active,false) = false
  )
);

create policy app_users_update_admin_final
on public.app_users for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy app_users_delete_admin_final
on public.app_users for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- accounts
create policy accounts_select_admin_or_assigned_final
on public.accounts for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or (
    lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
    and exists (
      select 1 from public.app_users u
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email',''))
        and coalesce(u.is_approved,false) = true
        and coalesce(u.is_active,false) = true
        and lower(coalesce(u.approval_status,'pending')) = 'approved'
    )
  )
);

create policy accounts_insert_admin_final
on public.accounts for insert
to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy accounts_update_admin_or_assigned_final
on public.accounts for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or (
    lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
    and exists (
      select 1 from public.app_users u
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email',''))
        and coalesce(u.is_approved,false) = true
        and coalesce(u.is_active,false) = true
        and lower(coalesce(u.approval_status,'pending')) = 'approved'
    )
  )
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or (
    lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
    and exists (
      select 1 from public.app_users u
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email',''))
        and coalesce(u.is_approved,false) = true
        and coalesce(u.is_active,false) = true
        and lower(coalesce(u.approval_status,'pending')) = 'approved'
    )
  )
);

create policy accounts_delete_admin_final
on public.accounts for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- Reusable inline account access condition for child tables:
-- admin OR the row's account is assigned to the approved signed-in user.

create policy account_notes_select_final
on public.account_notes for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
);
create policy account_notes_insert_final
on public.account_notes for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
);
create policy account_notes_update_admin_final
on public.account_notes for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy account_notes_delete_admin_final
on public.account_notes for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy activity_logs_select_final
on public.activity_logs for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
);
create policy activity_logs_insert_final
on public.activity_logs for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
);
create policy activity_logs_update_admin_final
on public.activity_logs for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy activity_logs_delete_admin_final
on public.activity_logs for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- Payment plans
create policy payment_plans_select_final
on public.payment_plans for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plans_insert_final
on public.payment_plans for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plans_update_final
on public.payment_plans for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plans_delete_admin_final
on public.payment_plans for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy payment_plan_payments_select_final
on public.payment_plan_payments for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plan_payments_insert_final
on public.payment_plan_payments for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plan_payments_update_final
on public.payment_plan_payments for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));
create policy payment_plan_payments_delete_admin_final
on public.payment_plan_payments for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- Other account-child tables
create policy payments_ledger_access_final
on public.payments_ledger for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));

create policy account_docs_access_final
on public.account_docs for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));

create policy call_results_access_final
on public.call_results for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));

create policy disputes_access_final
on public.disputes for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));

create policy settlements_access_final
on public.settlements for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists (select 1 from public.accounts a where a.id = account_id));

-- Follow-ups can be accessed through account, assigned follow-up, or creator.
create policy follow_ups_access_final
on public.follow_ups for all to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (select 1 from public.accounts a where a.id = account_id)
  or lower(coalesce(assigned_to_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,'')) = lower(coalesce(auth.jwt() ->> 'email',''))
);

-- Admin/dashboard/system tables
create policy audit_logs_admin_final
on public.audit_logs for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy role_permissions_select_approved_final
on public.role_permissions for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (
    select 1 from public.app_users u
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and coalesce(u.is_approved,false) = true
      and coalesce(u.is_active,false) = true
      and lower(coalesce(u.approval_status,'pending')) = 'approved'
  )
);
create policy role_permissions_insert_admin_final
on public.role_permissions for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy role_permissions_update_admin_final
on public.role_permissions for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy role_permissions_delete_admin_final
on public.role_permissions for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy import_batches_admin_final
on public.import_batches for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy company_settings_select_approved_final
on public.company_settings for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists (
    select 1 from public.app_users u
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and coalesce(u.is_approved,false) = true
      and coalesce(u.is_active,false) = true
      and lower(coalesce(u.approval_status,'pending')) = 'approved'
  )
);
create policy company_settings_insert_admin_final
on public.company_settings for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy company_settings_update_admin_final
on public.company_settings for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));
create policy company_settings_delete_admin_final
on public.company_settings for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- Make sure admin account is approved and active.
insert into public.app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
values ('afinch2678@gmail.com','admin','approved',true,true,now(),now(),now())
on conflict (email) do update
set role='admin',
    approval_status='approved',
    is_approved=true,
    is_active=true,
    updated_at=now(),
    last_seen_at=now();

-- Recreate admin_clear_accounts as SECURITY INVOKER to avoid SECURITY DEFINER warnings.
create or replace function public.admin_clear_accounts()
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  c_payment_plan_payments int := 0;
  c_payment_plans int := 0;
  c_payments_ledger int := 0;
  c_account_docs int := 0;
  c_account_notes int := 0;
  c_activity_logs int := 0;
  c_follow_ups int := 0;
  c_call_results int := 0;
  c_disputes int := 0;
  c_settlements int := 0;
  c_import_batches int := 0;
  c_accounts int := 0;
begin
  if v_email not in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') then
    raise exception 'Admin only';
  end if;

  delete from public.payment_plan_payments;
  get diagnostics c_payment_plan_payments = row_count;

  delete from public.payment_plans;
  get diagnostics c_payment_plans = row_count;

  delete from public.payments_ledger;
  get diagnostics c_payments_ledger = row_count;

  delete from public.account_docs;
  get diagnostics c_account_docs = row_count;

  delete from public.account_notes;
  get diagnostics c_account_notes = row_count;

  delete from public.activity_logs;
  get diagnostics c_activity_logs = row_count;

  delete from public.follow_ups;
  get diagnostics c_follow_ups = row_count;

  delete from public.call_results;
  get diagnostics c_call_results = row_count;

  delete from public.disputes;
  get diagnostics c_disputes = row_count;

  delete from public.settlements;
  get diagnostics c_settlements = row_count;

  delete from public.import_batches;
  get diagnostics c_import_batches = row_count;

  delete from public.accounts;
  get diagnostics c_accounts = row_count;

  return json_build_object(
    'ok', true,
    'deleted', json_build_object(
      'accounts', c_accounts,
      'account_notes', c_account_notes,
      'activity_logs', c_activity_logs,
      'payment_plans', c_payment_plans,
      'payment_plan_payments', c_payment_plan_payments,
      'payments_ledger', c_payments_ledger,
      'account_docs', c_account_docs,
      'follow_ups', c_follow_ups,
      'call_results', c_call_results,
      'disputes', c_disputes,
      'settlements', c_settlements,
      'import_batches', c_import_batches
    )
  );
end;
$$;

revoke all on function public.admin_clear_accounts() from public;
revoke all on function public.admin_clear_accounts() from anon;
grant execute on function public.admin_clear_accounts() to authenticated;

comment on function public.admin_clear_accounts() is 'Admin-only clear accounts function. SECURITY INVOKER. Checks admin email and relies on RLS delete policies.';

-- Seed required company settings without overwriting custom values.
insert into public.company_settings(setting_key, setting_value, updated_by_email, updated_at)
values
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system',now()),
  ('pdf_letter_templates_json','{}','system',now())
on conflict (setting_key) do nothing;

-- Repair older broken Authorized By values saved as emails.
update public.company_settings
set setting_value='Co Pilot Collections Manager',
    updated_by_email='system',
    updated_at=now()
where setting_key='pdf_authorized_by_default'
  and (
    setting_value is null
    or trim(setting_value) = ''
    or setting_value like '%@%'
  );

-- Schema cache nudge
notify pgrst, 'reload schema';




-- DEMO ADMIN / EMPLOYEE ACCOUNT SUPPORT
-- This prepares app_users rows for demo logins.
-- IMPORTANT: You still must create both users in Supabase Auth -> Users with these passwords:
-- demo-admin@copilotdemo.com / DemoAdmin123!
-- demo-employee@copilotdemo.com / DemoEmployee123!

insert into public.app_users (email, role, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
values
  ('afinch2678@gmail.com','admin','approved',true,true,now(),now(),now()),
  ('demo-admin@copilotdemo.com','admin','approved',true,true,now(),now(),now()),
  ('demo-employee@copilotdemo.com','employee','approved',true,true,now(),now(),now())
on conflict (email) do update
set role=excluded.role,
    approval_status='approved',
    is_approved=true,
    is_active=true,
    updated_at=now(),
    last_seen_at=now();

-- Optional: assign first 25 currently-unassigned accounts to demo employee for employee-view demo.
with demo_accounts as (
  select id
  from public.accounts
  where assigned_to_email is null or trim(coalesce(assigned_to_email,'')) = ''
  order by created_at asc
  limit 25
)
update public.accounts a
set assigned_to_email='demo-employee@copilotdemo.com',
    assigned_by_email='demo-admin@copilotdemo.com',
    assigned_at=now(),
    assignment_method='Demo Seed'
from demo_accounts d
where a.id=d.id;

notify pgrst, 'reload schema';

