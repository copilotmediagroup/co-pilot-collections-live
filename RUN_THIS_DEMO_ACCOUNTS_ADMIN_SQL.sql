
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
