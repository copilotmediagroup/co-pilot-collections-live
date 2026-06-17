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
