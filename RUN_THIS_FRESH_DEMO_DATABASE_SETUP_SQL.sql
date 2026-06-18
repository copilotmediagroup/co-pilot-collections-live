
-- FRESH DEMO DATABASE SETUP FIX
-- Run this in the NEW DEMO Supabase project.
--
-- Use this when you see:
-- ERROR: 42P01: relation "public.accounts" does not exist
--
-- This creates the full demo database structure, demo app users,
-- security policies, and the admin clear function.
--
-- IMPORTANT:
-- This does NOT create Supabase Auth passwords.
-- After running this SQL, create these in Supabase -> Authentication -> Users:
--   demo-admin@copilotdemo.com / DemoAdmin123!
--   demo-employee@copilotdemo.com / DemoEmployee123!

create extension if not exists pgcrypto;

-- =========================
-- CORE USERS
-- =========================

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text default 'employee',
  approval_status text default 'pending',
  is_approved boolean default false,
  is_active boolean default false,
  removed_at timestamptz,
  removed_by_email text,
  removal_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz
);

-- =========================
-- ACCOUNTS
-- =========================

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  portfolio text,
  account_description text,
  client_account_number text,
  source_account_id text,
  account_number text,
  issuer_name text,
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
  occupation text,
  description text,
  email text,
  original_creditor text,
  type_of_debt text,
  original_balance numeric,
  principal numeric,
  current_balance numeric,
  open_date text,
  date_account_opened text,
  account_receive_date text,
  delinquency_date text,
  charge_off_date text,
  orig_last_pmt_date text,
  last_payment_date text,
  last_payment_amount numeric,
  bank_routing_number text,
  bank_account_number text,
  orig_employer text,
  orig_store_name text,
  orig_store_city text,
  orig_store_state text,
  orig_bank_name text,
  orig_bank_acct_last4_digits text,
  orig_principal_balance numeric,
  orig_original_loan_amount numeric,
  orig_chargeoff_balance numeric,
  orig_loan_type text,
  orig_principal_loan_amount numeric,
  orig_interest_amount numeric,
  orig_return_fee numeric,
  raw_data jsonb default '{}'::jsonb,
  status text,
  disposition text,
  last_contact_number text,
  phone1 text,
  phone1_type text,
  phone1_line_type text,
  phone1_source text,
  phone1_note text,
  phone1_status text,
  phone2 text,
  phone2_type text,
  phone2_line_type text,
  phone2_source text,
  phone2_note text,
  phone2_status text,
  phone3 text,
  phone3_type text,
  phone3_line_type text,
  phone3_source text,
  phone3_note text,
  phone3_status text,
  phone4 text,
  phone4_type text,
  phone4_line_type text,
  phone4_source text,
  phone4_note text,
  phone4_status text,
  phone5 text,
  phone5_type text,
  phone5_line_type text,
  phone5_source text,
  phone5_note text,
  phone5_status text,
  phone6 text,
  phone6_type text,
  phone6_line_type text,
  phone6_source text,
  phone6_note text,
  phone6_status text,
  phone7 text,
  phone7_type text,
  phone7_line_type text,
  phone7_source text,
  phone7_note text,
  phone7_status text,
  phone8 text,
  phone8_type text,
  phone8_line_type text,
  phone8_source text,
  phone8_note text,
  phone8_status text,
  phone9 text,
  phone9_type text,
  phone9_line_type text,
  phone9_source text,
  phone9_note text,
  phone9_status text,
  phone10 text,
  phone10_type text,
  phone10_line_type text,
  phone10_source text,
  phone10_note text,
  phone10_status text,
  assigned_to_email text,
  assigned_by_email text,
  assigned_at timestamptz,
  assignment_method text,
  assignment_group_id text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add columns again safely in case an old table already exists.
alter table public.accounts
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists assigned_to_email text,
  add column if not exists assigned_by_email text,
  add column if not exists assigned_at timestamptz,
  add column if not exists assignment_method text,
  add column if not exists assignment_group_id text,
  add column if not exists raw_data jsonb default '{}'::jsonb;

-- Ensure important account columns exist if table was partially made.
alter table public.accounts
  add column if not exists portfolio text,
  add column if not exists account_description text,
  add column if not exists client_account_number text,
  add column if not exists source_account_id text,
  add column if not exists account_number text,
  add column if not exists issuer_name text,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists full_name text,
  add column if not exists ssn text,
  add column if not exists dob text,
  add column if not exists address text,
  add column if not exists address2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text,
  add column if not exists employer text,
  add column if not exists occupation text,
  add column if not exists description text,
  add column if not exists email text,
  add column if not exists original_creditor text,
  add column if not exists type_of_debt text,
  add column if not exists original_balance numeric,
  add column if not exists principal numeric,
  add column if not exists current_balance numeric,
  add column if not exists status text default 'New',
  add column if not exists disposition text,
  add column if not exists last_contact_number text;

-- Phone columns
do $$
declare i int;
begin
  for i in 1..10 loop
    execute format('alter table public.accounts add column if not exists phone%s text', i);
    execute format('alter table public.accounts add column if not exists phone%s_type text', i);
    execute format('alter table public.accounts add column if not exists phone%s_line_type text', i);
    execute format('alter table public.accounts add column if not exists phone%s_source text', i);
    execute format('alter table public.accounts add column if not exists phone%s_note text', i);
    execute format('alter table public.accounts add column if not exists phone%s_status text', i);
  end loop;
end $$;

-- =========================
-- ACCOUNT CHILD TABLES
-- =========================

create table if not exists public.account_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  note text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  action_type text,
  action_text text,
  target_type text,
  target_id text,
  created_by_email text,
  created_at timestamptz default now()
);

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  total_amount numeric default 0,
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

create table if not exists public.payment_plan_payments (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid references public.payment_plans(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  amount numeric default 0,
  payment_amount numeric default 0,
  due_date date,
  scheduled_date date,
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

-- If older table existed, add missing payment columns.
alter table public.payment_plan_payments
  add column if not exists payment_plan_id uuid,
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists amount numeric default 0,
  add column if not exists payment_amount numeric default 0,
  add column if not exists due_date date,
  add column if not exists scheduled_date date,
  add column if not exists payment_date date,
  add column if not exists paid_at timestamptz,
  add column if not exists status text default 'Scheduled',
  add column if not exists payment_method text,
  add column if not exists reference_number text,
  add column if not exists notes text,
  add column if not exists created_by_email text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

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

-- =========================
-- ADMIN / SETTINGS TABLES
-- =========================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
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

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_accounts_created_at on public.accounts(created_at);
create index if not exists idx_accounts_account_number on public.accounts(account_number);
create index if not exists idx_accounts_assigned_to_email on public.accounts(lower(coalesce(assigned_to_email,'')));
create index if not exists idx_accounts_status on public.accounts(status);
create index if not exists idx_account_notes_account_id on public.account_notes(account_id);
create index if not exists idx_activity_logs_account_id on public.activity_logs(account_id);
create index if not exists idx_payment_plans_account_id on public.payment_plans(account_id);
create index if not exists idx_payment_plan_payments_account_id on public.payment_plan_payments(account_id);
create index if not exists idx_payment_plan_payments_payment_plan_id on public.payment_plan_payments(payment_plan_id);
create index if not exists idx_payments_ledger_account_id on public.payments_ledger(account_id);
create index if not exists idx_account_docs_account_id on public.account_docs(account_id);
create index if not exists idx_call_results_account_id on public.call_results(account_id);
create index if not exists idx_follow_ups_account_id on public.follow_ups(account_id);
create index if not exists idx_follow_ups_assigned on public.follow_ups(lower(coalesce(assigned_to_email,'')));

-- =========================
-- RLS POLICIES
-- =========================

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

alter table public.app_users enable row level security;
alter table public.accounts enable row level security;
alter table public.account_notes enable row level security;
alter table public.activity_logs enable row level security;
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

-- app_users
create policy app_users_select_admin_or_self
on public.app_users for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(email)=lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy app_users_insert_self_or_admin
on public.app_users for insert to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(email)=lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy app_users_update_admin
on public.app_users for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy app_users_delete_admin
on public.app_users for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- accounts
create policy accounts_select_admin_or_assigned
on public.accounts for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(assigned_to_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy accounts_insert_admin
on public.accounts for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy accounts_update_admin_or_assigned
on public.accounts for update to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(assigned_to_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or lower(coalesce(assigned_to_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy accounts_delete_admin
on public.accounts for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- child tables: admin or accessible account
create policy account_notes_access on public.account_notes for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy activity_logs_access on public.activity_logs for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy payment_plans_access on public.payment_plans for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy payment_plan_payments_access on public.payment_plan_payments for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy payments_ledger_access on public.payments_ledger for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy account_docs_access on public.account_docs for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy call_results_access on public.call_results for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy follow_ups_access on public.follow_ups for all to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists(select 1 from public.accounts a where a.id=account_id)
  or lower(coalesce(assigned_to_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com')
  or exists(select 1 from public.accounts a where a.id=account_id)
  or lower(coalesce(assigned_to_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
  or lower(coalesce(created_by_email,''))=lower(coalesce(auth.jwt() ->> 'email',''))
);

create policy disputes_access on public.disputes for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

create policy settlements_access on public.settlements for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') or exists(select 1 from public.accounts a where a.id=account_id));

-- admin/system tables
create policy audit_logs_admin on public.audit_logs for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy import_batches_admin on public.import_batches for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy role_permissions_select on public.role_permissions for select to authenticated
using (auth.role()='authenticated');
create policy role_permissions_admin_write on public.role_permissions for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

create policy company_settings_select on public.company_settings for select to authenticated
using (auth.role()='authenticated');
create policy company_settings_admin_write on public.company_settings for all to authenticated
using (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'))
with check (lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com','demo-admin@copilotdemo.com'));

-- =========================
-- CLEAR ACCOUNTS RPC
-- =========================

create or replace function public.admin_clear_accounts()
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  c_accounts int := 0;
begin
  if v_email not in ('afinch2678@gmail.com','demo-admin@copilotdemo.com') then
    raise exception 'Admin only';
  end if;

  delete from public.payment_plan_payments;
  delete from public.payment_plans;
  delete from public.payments_ledger;
  delete from public.account_docs;
  delete from public.account_notes;
  delete from public.activity_logs;
  delete from public.follow_ups;
  delete from public.call_results;
  delete from public.disputes;
  delete from public.settlements;
  delete from public.import_batches;
  delete from public.accounts;
  get diagnostics c_accounts = row_count;

  return json_build_object('ok', true, 'deleted_accounts', c_accounts);
end;
$$;

revoke all on function public.admin_clear_accounts() from public;
revoke all on function public.admin_clear_accounts() from anon;
grant execute on function public.admin_clear_accounts() to authenticated;

-- =========================
-- SEED SETTINGS + DEMO USERS
-- =========================

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

insert into public.company_settings(setting_key, setting_value, updated_by_email, updated_at)
values
  ('app_brand_name','Co Pilot Collections Manager','system',now()),
  ('app_brand_subtitle','Private Collections CRM','system',now()),
  ('pdf_authorized_by_default','Co Pilot Collections Manager','system',now()),
  ('pdf_letter_templates_json','{}','system',now())
on conflict (setting_key) do nothing;

notify pgrst, 'reload schema';
