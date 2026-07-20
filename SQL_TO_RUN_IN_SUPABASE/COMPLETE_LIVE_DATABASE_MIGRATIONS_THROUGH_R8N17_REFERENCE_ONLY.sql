-- CO PILOT COLLECTIONS MANAGER — COMPLETE LIVE MIGRATION REFERENCE THROUGH R8N17
-- LIVE ONLY: https://bwvufgzbkaymffwxuuzr.supabase.co
--
-- This file preserves the original migrations in their required order.
-- The current LIVE project was already advanced through R8N17 during the existing build.
-- DO NOT automatically rerun this entire file on the current LIVE database.
-- Use it for a fresh installation, disaster recovery, or when the next thread determines
-- that a specific missing section must be applied.


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_MESSENGER_STAFF_NAMES_SQL.sql
============================================================================================

-- Co Pilot Collections Manager - Messenger Staff Names SQL (LIVE)
-- Run this in the LIVE Supabase SQL Editor before testing the Messenger Names package.

alter table public.app_users add column if not exists full_name text;

create or replace function public.cpcm_update_staff_display_name(target_email text, new_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  target text := lower(trim(coalesce(target_email,'')));
  clean text := nullif(trim(coalesce(new_full_name,'')),'');
  actor_is_admin boolean := lower(coalesce(auth.jwt() ->> 'email','')) in ('afinch2678@gmail.com');
begin
  if actor_email = '' then
    raise exception 'not authenticated';
  end if;

  if target = '' then
    raise exception 'target_email required';
  end if;

  if not (actor_is_admin or actor_email = target) then
    raise exception 'not allowed';
  end if;

  update public.app_users
     set full_name = clean,
         updated_at = now()
   where lower(email) = target;

  if not found then
    insert into public.app_users (email, role, full_name, approval_status, is_approved, is_active, created_at, updated_at, last_seen_at)
    values (
      target,
      case when target = 'afinch2678@gmail.com' then 'admin' else 'employee' end,
      clean,
      case when target = 'afinch2678@gmail.com' then 'approved' else 'pending' end,
      case when target = 'afinch2678@gmail.com' then true else false end,
      case when target = 'afinch2678@gmail.com' then true else false end,
      now(), now(), now()
    );
  end if;

  return jsonb_build_object('ok', true, 'email', target, 'full_name', clean);
end;
$$;

grant execute on function public.cpcm_update_staff_display_name(text,text) to authenticated;

-- Keep the LIVE admin's real name set by default.
update public.app_users
   set full_name = coalesce(nullif(full_name,''),'Antonio Finch'),
       role = 'admin',
       approval_status = 'approved',
       is_approved = true,
       is_active = true,
       updated_at = now()
 where lower(email) = 'afinch2678@gmail.com';

notify pgrst, 'reload schema';


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_CLIENT_PORTAL_MVP_SQL.sql
============================================================================================

-- Co Pilot Collections Manager - Client / Portfolio Owner Portal MVP R7 (LIVE)
-- Run in the matching LIVE Supabase SQL Editor before uploading/testing the R7 ZIP.
-- This SQL adds client-role profile fields, secure portfolio assignment, and client-safe reporting RPCs.

alter table public.app_users add column if not exists full_name text;
alter table public.app_users add column if not exists client_contact_name text;
alter table public.app_users add column if not exists client_company_name text;
alter table public.app_users add column if not exists client_portal_enabled boolean not null default false;
alter table public.app_users add column if not exists client_can_view_accounts boolean not null default true;
alter table public.app_users add column if not exists client_can_view_payments boolean not null default true;
alter table public.app_users add column if not exists client_can_download_reports boolean not null default true;

-- Expand any old admin/employee-only role check so Client is a valid role.
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid='public.app_users'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%role%' loop
    execute format('alter table public.app_users drop constraint %I',c.conname);
  end loop;
  if not exists(select 1 from pg_constraint where conrelid='public.app_users'::regclass and conname='app_users_role_check') then
    alter table public.app_users add constraint app_users_role_check check (lower(role) in ('admin','employee','client'));
  end if;
end $$;

create table if not exists public.client_portfolio_assignments (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  portfolio_name text not null,
  assigned_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_email, portfolio_name)
);

create index if not exists client_portfolio_assignments_client_email_idx on public.client_portfolio_assignments (lower(client_email));
create index if not exists client_portfolio_assignments_portfolio_name_idx on public.client_portfolio_assignments (lower(portfolio_name));

alter table public.client_portfolio_assignments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_portfolio_assignments' and policyname='client_assignments_select_own') then
    create policy client_assignments_select_own on public.client_portfolio_assignments for select to authenticated
      using (lower(client_email)=lower(coalesce(auth.jwt()->>'email','')) or lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='client_portfolio_assignments' and policyname='client_assignments_admin_all') then
    create policy client_assignments_admin_all on public.client_portfolio_assignments for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
end $$;

-- Restrictive client policies add a safety layer even if older broad authenticated policies exist.
create or replace function public.cpcm_current_is_client()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='client'
  );
$$;

grant execute on function public.cpcm_current_is_client() to authenticated;

do $$
begin
  if to_regclass('public.accounts') is not null then
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='accounts' and policyname='cpcm_client_accounts_select_restrict') then
      execute $p$create policy cpcm_client_accounts_select_restrict on public.accounts as restrictive for select to authenticated using (
        not public.cpcm_current_is_client() or exists(
          select 1 from public.client_portfolio_assignments c
          where lower(c.client_email)=lower(coalesce(auth.jwt()->>'email',''))
            and lower(trim(c.portfolio_name))=lower(trim(coalesce(accounts.portfolio,'')))
        )
      )$p$;
    end if;
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='accounts' and policyname='cpcm_client_accounts_insert_deny') then
      execute $p$create policy cpcm_client_accounts_insert_deny on public.accounts as restrictive for insert to authenticated with check (not public.cpcm_current_is_client())$p$;
    end if;
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='accounts' and policyname='cpcm_client_accounts_update_deny') then
      execute $p$create policy cpcm_client_accounts_update_deny on public.accounts as restrictive for update to authenticated using (not public.cpcm_current_is_client()) with check (not public.cpcm_current_is_client())$p$;
    end if;
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='accounts' and policyname='cpcm_client_accounts_delete_deny') then
      execute $p$create policy cpcm_client_accounts_delete_deny on public.accounts as restrictive for delete to authenticated using (not public.cpcm_current_is_client())$p$;
    end if;
  end if;
end $$;

-- Financial rows may be read only when their account belongs to an assigned portfolio; clients cannot write them.
do $$
declare t text;
begin
  foreach t in array array['payments_ledger','payment_plans','payment_plan_payments','settlements','payment_promises'] loop
    if to_regclass('public.'||t) is not null then
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cpcm_client_'||t||'_select_restrict') then
        execute format($fmt$
          create policy %I on public.%I as restrictive for select to authenticated
          using (
            not public.cpcm_current_is_client() or exists(
              select 1 from public.accounts a
              join public.client_portfolio_assignments c
                on lower(trim(c.portfolio_name))=lower(trim(coalesce(a.portfolio,'')))
              where a.id=%I.account_id
                and lower(c.client_email)=lower(coalesce(auth.jwt()->>'email',''))
            )
          )
        $fmt$,'cpcm_client_'||t||'_select_restrict',t,t);
      end if;
      if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cpcm_client_'||t||'_write_deny') then
        execute format(
          'create policy %I on public.%I as restrictive for all to authenticated using (not public.cpcm_current_is_client()) with check (not public.cpcm_current_is_client())',
          'cpcm_client_'||t||'_write_deny',t
        );
      end if;
    end if;
  end loop;
end $$;

-- Internal-only tables remain unavailable to client-role users even if an older policy was broad.
do $$
declare t text;
begin
  foreach t in array array['account_notes','activity_logs','call_results','team_messages','follow_ups','collector_alerts','audit_logs','employee_permissions','communications','disputes'] loop
    if to_regclass('public.'||t) is not null and not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cpcm_client_'||t||'_internal_deny') then
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (not public.cpcm_current_is_client()) with check (not public.cpcm_current_is_client())',
        'cpcm_client_'||t||'_internal_deny',t
      );
    end if;
  end loop;
end $$;

-- Client users can see only their own app_users profile through direct REST calls.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='app_users' and policyname='cpcm_client_app_users_restrict') then
    create policy cpcm_client_app_users_restrict on public.app_users as restrictive for select to authenticated
      using (not public.cpcm_current_is_client() or lower(email)=lower(coalesce(auth.jwt()->>'email','')));
  end if;
end $$;

-- R7 ledger compatibility: older installations may not have all ledger fields used by the portal.
do $$
begin
  if to_regclass('public.payments_ledger') is null then
    raise exception 'public.payments_ledger does not exist. Create/run the payment ledger schema before the client portal.';
  end if;
end $$;

alter table public.payments_ledger add column if not exists payment_date date;
alter table public.payments_ledger add column if not exists amount numeric(14,2);
alter table public.payments_ledger add column if not exists payment_type text;
alter table public.payments_ledger add column if not exists payment_method text;
alter table public.payments_ledger add column if not exists status text;
alter table public.payments_ledger add column if not exists receipt_number text;
alter table public.payments_ledger add column if not exists balance_before numeric(14,2);
alter table public.payments_ledger add column if not exists balance_after numeric(14,2);
alter table public.payments_ledger add column if not exists notes text;
alter table public.payments_ledger add column if not exists created_by_email text;
alter table public.payments_ledger add column if not exists plan_payment_id uuid;
alter table public.payments_ledger add column if not exists created_at timestamptz default now();
alter table public.payments_ledger add column if not exists updated_at timestamptz default now();

alter table public.payments_ledger alter column payment_type set default 'Payment';
alter table public.payments_ledger alter column payment_method set default 'Other';
alter table public.payments_ledger alter column status set default 'Completed';
alter table public.payments_ledger alter column created_at set default now();
alter table public.payments_ledger alter column updated_at set default now();

update public.payments_ledger
set payment_type='Payment'
where nullif(trim(payment_type),'') is null;

update public.payments_ledger
set payment_method='Other'
where nullif(trim(payment_method),'') is null;

update public.payments_ledger
set status='Completed'
where nullif(trim(status),'') is null;

update public.payments_ledger
set payment_date=coalesce(payment_date,created_at::date,current_date)
where payment_date is null;

update public.payments_ledger
set updated_at=coalesce(updated_at,created_at,now())
where updated_at is null;

create index if not exists payments_ledger_account_date_idx
  on public.payments_ledger(account_id,payment_date desc);


create or replace function public.cpcm_admin_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); result jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'role',u.role,'approval_status',u.approval_status,
      'is_approved',u.is_approved,'is_active',u.is_active,'client_contact_name',u.client_contact_name,
      'client_company_name',u.client_company_name,'client_portal_enabled',u.client_portal_enabled,'client_can_view_accounts',u.client_can_view_accounts,'client_can_view_payments',u.client_can_view_payments,'client_can_download_reports',u.client_can_download_reports
    ) order by lower(u.email)) from public.app_users u where lower(u.email)<>actor),'[]'::jsonb),
    'portfolios',coalesce((select jsonb_agg(x.portfolio order by lower(x.portfolio)) from (select distinct trim(a.portfolio) portfolio from public.accounts a where nullif(trim(a.portfolio),'') is not null) x),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('client_email',lower(c.client_email),'portfolio_name',c.portfolio_name,'assigned_by_email',c.assigned_by_email,'updated_at',c.updated_at) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_client_portal_access(target_email text, contact_name text, company_name text, approved boolean, portfolio_names text[], can_view_accounts boolean, can_view_payments boolean, can_download_reports boolean)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); target text:=lower(trim(coalesce(target_email,''))); p text;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  update public.app_users set role='client',full_name=coalesce(nullif(trim(contact_name),''),full_name),client_contact_name=nullif(trim(contact_name),''),client_company_name=nullif(trim(company_name),''),client_portal_enabled=approved,client_can_view_accounts=coalesce(can_view_accounts,true),client_can_view_payments=coalesce(can_view_payments,true),client_can_download_reports=coalesce(can_download_reports,true),approval_status=case when approved then 'approved' else 'pending' end,is_approved=approved,is_active=approved,updated_at=now() where lower(email)=target;
  if not found then
    insert into public.app_users(email,role,full_name,client_contact_name,client_company_name,client_portal_enabled,client_can_view_accounts,client_can_view_payments,client_can_download_reports,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values(target,'client',nullif(trim(contact_name),''),nullif(trim(contact_name),''),nullif(trim(company_name),''),approved,coalesce(can_view_accounts,true),coalesce(can_view_payments,true),coalesce(can_download_reports,true),case when approved then 'approved' else 'pending' end,approved,approved,now(),now(),now());
  end if;
  delete from public.client_portfolio_assignments where lower(client_email)=target;
  foreach p in array coalesce(portfolio_names,array[]::text[]) loop
    if nullif(trim(p),'') is not null then insert into public.client_portfolio_assignments(client_email,portfolio_name,assigned_by_email,updated_at) values(target,trim(p),actor,now()) on conflict(client_email,portfolio_name) do update set assigned_by_email=excluded.assigned_by_email,updated_at=now(); end if;
  end loop;
  return jsonb_build_object('ok',true,'email',target,'approved',approved,'portfolio_count',coalesce(array_length(portfolio_names,1),0));
end $$;

create or replace function public.cpcm_admin_disable_client_portal_access(target_email text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); target text:=lower(trim(coalesce(target_email,'')));
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  update public.app_users set client_portal_enabled=false,approval_status='pending',is_approved=false,is_active=false,updated_at=now() where lower(email)=target and lower(role)='client';
  return jsonb_build_object('ok',true,'email',target);
end $$;

create or replace function public.cpcm_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); profile_row public.app_users%rowtype; result jsonb;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false) or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then raise exception 'client portal access is not approved'; end if;

  with allowed as (
    select distinct lower(trim(portfolio_name)) portfolio_key,trim(portfolio_name) portfolio_name from public.client_portfolio_assignments where lower(client_email)=actor
  ), acc as (
    select a.* from public.accounts a join allowed x on lower(trim(coalesce(a.portfolio,'')))=x.portfolio_key
  ), pay as (
    select l.account_id,sum(case when lower(coalesce(l.status,''))='completed' and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') then coalesce(l.amount,0) else 0 end) collected,max(l.payment_date) last_payment_date
    from public.payments_ledger l join acc a on a.id=l.account_id group by l.account_id
  ), plan as (
    select distinct on (p.account_id) p.account_id,p.status,p.remaining_amount,p.total_amount from public.payment_plans p join acc a on a.id=p.account_id order by p.account_id,p.created_at desc
  ), port as (
    select a.portfolio portfolio_name,count(*) account_count,sum(coalesce(a.original_balance,a.current_balance,0)) total_placed,sum(coalesce(a.current_balance,0)) current_balance,sum(coalesce(pay.collected,0)) collected
    from acc a left join pay on pay.account_id=a.id group by a.portfolio
  ), stats as (
    select count(*) account_count,sum(coalesce(a.original_balance,a.current_balance,0)) total_placed,sum(coalesce(a.current_balance,0)) current_balance,sum(coalesce(pay.collected,0)) total_collected,
      count(*) filter(where coalesce(a.current_balance,0)<=0 or lower(coalesce(a.status,'')) in ('settled','paid','paid in full','pif','closed')) paid_accounts,
      count(*) filter(where lower(coalesce(plan.status,''))='active') active_plans
    from acc a left join pay on pay.account_id=a.id left join plan on plan.account_id=a.id
  ), settlement_stats as (
    select count(*) filter(where lower(coalesce(s.status,'')) in ('approved','paid','settled','completed')) approved_settlements,
      sum(case when lower(coalesce(s.status,'')) in ('approved','paid','settled','completed') then coalesce(s.settlement_amount,0) else 0 end) approved_settlement_amount
    from public.settlements s join acc a on a.id=s.account_id
  ), promise_stats as (
    select count(*) filter(where lower(coalesce(p.status,'')) like '%broken%' or lower(coalesce(p.status,'')) like '%missed%') broken_promises from public.payment_promises p join acc a on a.id=p.account_id
  ), plan_perf as (
    select count(*) filter(where lower(coalesce(pp.status,''))='paid') paid_count,count(*) filter(where lower(coalesce(pp.status,'')) not in ('cancelled','void')) total_count from public.payment_plan_payments pp join acc a on a.id=pp.account_id
  )
  select jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'full_name',profile_row.full_name,'contact_name',profile_row.client_contact_name,'company_name',profile_row.client_company_name,'can_view_accounts',profile_row.client_can_view_accounts,'can_view_payments',profile_row.client_can_view_payments,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object('account_count',coalesce(st.account_count,0),'total_placed',coalesce(st.total_placed,0),'current_balance',coalesce(st.current_balance,0),'total_collected',coalesce(st.total_collected,0),'liquidation_rate',case when coalesce(st.total_placed,0)>0 then st.total_collected/st.total_placed*100 else 0 end,'paid_accounts',coalesce(st.paid_accounts,0),'active_plans',coalesce(st.active_plans,0),'approved_settlements',coalesce(ss.approved_settlements,0),'approved_settlement_amount',coalesce(ss.approved_settlement_amount,0),'broken_promises',coalesce(ps.broken_promises,0),'plan_performance',case when coalesce(pp.total_count,0)>0 then pp.paid_count::numeric/pp.total_count*100 else 0 end),
    'portfolios',coalesce((select jsonb_agg(to_jsonb(port) order by lower(portfolio_name)) from port),'[]'::jsonb),
    'accounts',case when coalesce(profile_row.client_can_view_accounts,true) then coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'consumer_name',coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name))),'account_number',coalesce(a.account_number,a.client_account_number,a.source_account_id),'portfolio',a.portfolio,'original_creditor',a.original_creditor,'original_balance',coalesce(a.original_balance,a.current_balance,0),'current_balance',coalesce(a.current_balance,0),'status',a.status,'collected',coalesce(pay.collected,0),'last_payment_date',pay.last_payment_date,'plan_status',plan.status) order by lower(coalesce(a.portfolio,'')),lower(coalesce(a.full_name,a.last_name,''))) from acc a left join pay on pay.account_id=a.id left join plan on plan.account_id=a.id),'[]'::jsonb) else '[]'::jsonb end,
    'recent_payments',case when coalesce(profile_row.client_can_view_payments,true) then coalesce((select jsonb_agg(x.j order by x.payment_date desc) from (select l.payment_date,jsonb_build_object('payment_date',l.payment_date,'consumer_name',coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name))),'portfolio',a.portfolio,'amount',l.amount,'payment_method',l.payment_method,'receipt_number',l.receipt_number) j from public.payments_ledger l join acc a on a.id=l.account_id where lower(coalesce(l.status,''))='completed' and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') order by l.payment_date desc,l.created_at desc limit 25) x),'[]'::jsonb) else '[]'::jsonb end
  ) into result from stats st cross join settlement_stats ss cross join promise_stats ps cross join plan_perf pp;
  return result;
end $$;

grant select on public.client_portfolio_assignments to authenticated;
grant execute on function public.cpcm_admin_client_portal_snapshot() to authenticated;
grant execute on function public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) to authenticated;
grant execute on function public.cpcm_admin_disable_client_portal_access(text) to authenticated;
grant execute on function public.cpcm_client_portal_snapshot() to authenticated;

notify pgrst,'reload schema';


-- R6 STAFF APPROVAL ACTIONS FIX (also provided as a separate incremental SQL file)

alter table public.app_users add column if not exists removed_at timestamptz;
alter table public.app_users add column if not exists removed_by_email text;
alter table public.app_users add column if not exists removal_reason text;

create or replace function public.cpcm_admin_manage_staff_user(
  target_email text,
  requested_action text,
  removal_reason_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_email,'')));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  target_role text;
  released_count integer:=0;
  result jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  if target=actor then raise exception 'protected admin account cannot be changed'; end if;

  select lower(coalesce(role,'employee')) into target_role
  from public.app_users where lower(email)=target limit 1;
  if not found then raise exception 'user not found'; end if;

  if action_name='approved' then
    update public.app_users set
      approval_status='approved',is_approved=true,is_active=true,
      client_portal_enabled=case when target_role='client' then true else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='pending' then
    update public.app_users set
      approval_status='pending',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='rejected' then
    update public.app_users set
      approval_status='rejected',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='activate' then
    update public.app_users set
      is_active=true,
      client_portal_enabled=case when target_role='client' and coalesce(is_approved,false) then true else client_portal_enabled end,
      updated_at=now()
    where lower(email)=target;
  elsif action_name='deactivate' then
    update public.app_users set
      is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      updated_at=now()
    where lower(email)=target;
  elsif action_name='remove' then
    update public.app_users set
      approval_status='removed',is_approved=false,is_active=false,client_portal_enabled=false,
      removed_at=now(),removed_by_email=actor,removal_reason=coalesce(nullif(trim(removal_reason_text),''),'Fired / removed'),updated_at=now()
    where lower(email)=target;

    update public.accounts set
      assigned_to_email=null,assigned_by_email=actor,assigned_at=null,
      assignment_method='employee_removed',assignment_group_id=null,updated_at=now()
    where lower(coalesce(assigned_to_email,''))=target;
    get diagnostics released_count=row_count;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select jsonb_build_object(
    'ok',true,'email',email,'role',role,'approval_status',approval_status,
    'is_approved',is_approved,'is_active',is_active,
    'client_portal_enabled',client_portal_enabled,
    'assigned_accounts_released',released_count
  ) into result from public.app_users where lower(email)=target limit 1;
  return result;
end;
$$;

revoke all on function public.cpcm_admin_manage_staff_user(text,text,text) from public;
grant execute on function public.cpcm_admin_manage_staff_user(text,text,text) to authenticated;
notify pgrst,'reload schema';


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_STAFF_APPROVAL_ACTIONS_FIX_SQL.sql
============================================================================================

-- Co Pilot Collections Manager — Staff Approval Actions Fix R6 (LIVE)
-- Run this AFTER RUN_THIS_CLIENT_PORTAL_MVP_SQL.sql in the matching LIVE Supabase project.
-- Fixes Approve / Pending / Reject / Activate / Pause / Remove by using an admin-only SECURITY DEFINER RPC.

alter table public.app_users add column if not exists removed_at timestamptz;
alter table public.app_users add column if not exists removed_by_email text;
alter table public.app_users add column if not exists removal_reason text;

create or replace function public.cpcm_admin_manage_staff_user(
  target_email text,
  requested_action text,
  removal_reason_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_email,'')));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  target_role text;
  released_count integer:=0;
  result jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  if target=actor then raise exception 'protected admin account cannot be changed'; end if;

  select lower(coalesce(role,'employee')) into target_role
  from public.app_users where lower(email)=target limit 1;
  if not found then raise exception 'user not found'; end if;

  if action_name='approved' then
    update public.app_users set
      approval_status='approved',is_approved=true,is_active=true,
      client_portal_enabled=case when target_role='client' then true else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='pending' then
    update public.app_users set
      approval_status='pending',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='rejected' then
    update public.app_users set
      approval_status='rejected',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where lower(email)=target;
  elsif action_name='activate' then
    update public.app_users set
      is_active=true,
      client_portal_enabled=case when target_role='client' and coalesce(is_approved,false) then true else client_portal_enabled end,
      updated_at=now()
    where lower(email)=target;
  elsif action_name='deactivate' then
    update public.app_users set
      is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      updated_at=now()
    where lower(email)=target;
  elsif action_name='remove' then
    update public.app_users set
      approval_status='removed',is_approved=false,is_active=false,client_portal_enabled=false,
      removed_at=now(),removed_by_email=actor,removal_reason=coalesce(nullif(trim(removal_reason_text),''),'Fired / removed'),updated_at=now()
    where lower(email)=target;

    update public.accounts set
      assigned_to_email=null,assigned_by_email=actor,assigned_at=null,
      assignment_method='employee_removed',assignment_group_id=null,updated_at=now()
    where lower(coalesce(assigned_to_email,''))=target;
    get diagnostics released_count=row_count;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select jsonb_build_object(
    'ok',true,'email',email,'role',role,'approval_status',approval_status,
    'is_approved',is_approved,'is_active',is_active,
    'client_portal_enabled',client_portal_enabled,
    'assigned_accounts_released',released_count
  ) into result from public.app_users where lower(email)=target limit 1;
  return result;
end;
$$;

revoke all on function public.cpcm_admin_manage_staff_user(text,text,text) from public;
grant execute on function public.cpcm_admin_manage_staff_user(text,text,text) to authenticated;
notify pgrst,'reload schema';


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_CLIENT_PORTAL_LEDGER_SCHEMA_FIX_R7.sql
============================================================================================

-- Co Pilot Collections Manager - Client Portal Ledger Schema Fix R7 (LIVE)
-- Run this in the matching LIVE Supabase SQL Editor after R5/R6.
-- Fixes: column l.payment_type does not exist.
-- This is additive and preserves existing payment rows.

do $$
begin
  if to_regclass('public.payments_ledger') is null then
    raise exception 'public.payments_ledger does not exist. Create/run the payment ledger schema before the client portal.';
  end if;
end $$;

alter table public.payments_ledger add column if not exists payment_date date;
alter table public.payments_ledger add column if not exists amount numeric(14,2);
alter table public.payments_ledger add column if not exists payment_type text;
alter table public.payments_ledger add column if not exists payment_method text;
alter table public.payments_ledger add column if not exists status text;
alter table public.payments_ledger add column if not exists receipt_number text;
alter table public.payments_ledger add column if not exists balance_before numeric(14,2);
alter table public.payments_ledger add column if not exists balance_after numeric(14,2);
alter table public.payments_ledger add column if not exists notes text;
alter table public.payments_ledger add column if not exists created_by_email text;
alter table public.payments_ledger add column if not exists plan_payment_id uuid;
alter table public.payments_ledger add column if not exists created_at timestamptz default now();
alter table public.payments_ledger add column if not exists updated_at timestamptz default now();

alter table public.payments_ledger alter column payment_type set default 'Payment';
alter table public.payments_ledger alter column payment_method set default 'Other';
alter table public.payments_ledger alter column status set default 'Completed';
alter table public.payments_ledger alter column created_at set default now();
alter table public.payments_ledger alter column updated_at set default now();

update public.payments_ledger
set payment_type='Payment'
where nullif(trim(payment_type),'') is null;

update public.payments_ledger
set payment_method='Other'
where nullif(trim(payment_method),'') is null;

update public.payments_ledger
set status='Completed'
where nullif(trim(status),'') is null;

update public.payments_ledger
set payment_date=coalesce(payment_date,created_at::date,current_date)
where payment_date is null;

update public.payments_ledger
set updated_at=coalesce(updated_at,created_at,now())
where updated_at is null;

create index if not exists payments_ledger_account_date_idx
  on public.payments_ledger(account_id,payment_date desc);

notify pgrst,'reload schema';


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_CLIENT_REMITTANCE_AGENCY_FEE_R8.sql
============================================================================================

-- Co Pilot Collections Manager - Client Remittance + Agency Fee Accounting R8 (LIVE)
-- Run in the matching LIVE Supabase SQL Editor after the Client Portal R7 SQL.
-- Additive migration: preserves all existing accounts, payments, client assignments, and documents.

-- Capture the actual processor charge on an individual ledger payment when known.
alter table public.payments_ledger add column if not exists processor_fee numeric(14,2) not null default 0;
update public.payments_ledger set processor_fee=0 where processor_fee is null;

create table if not exists public.client_fee_schedules (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  portfolio_name text not null,
  agency_fee_percent numeric(7,4) not null default 30,
  processor_fee_percent numeric(7,4) not null default 0,
  processor_fee_fixed numeric(14,2) not null default 0,
  processor_fee_payer text not null default 'client',
  remittance_frequency text not null default 'Monthly',
  payment_terms_days integer not null default 10,
  is_active boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_fee_schedule_percent_check check (agency_fee_percent between 0 and 100 and processor_fee_percent between 0 and 100),
  constraint client_fee_schedule_payer_check check (lower(processor_fee_payer) in ('client','agency')),
  constraint client_fee_schedule_terms_check check (payment_terms_days between 0 and 365),
  unique (client_email, portfolio_name)
);

create table if not exists public.client_remittance_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  client_email text not null,
  client_company_name text,
  portfolio_name text not null,
  period_start date not null,
  period_end date not null,
  payment_count integer not null default 0,
  gross_collections numeric(14,2) not null default 0,
  reversals numeric(14,2) not null default 0,
  net_collections numeric(14,2) not null default 0,
  agency_fee_percent numeric(7,4) not null default 0,
  agency_fee_amount numeric(14,2) not null default 0,
  processor_fees numeric(14,2) not null default 0,
  processor_fee_payer text not null default 'client',
  adjustments numeric(14,2) not null default 0,
  net_remittance numeric(14,2) not null default 0,
  status text not null default 'Draft',
  due_date date,
  approved_at timestamptz,
  approved_by_email text,
  paid_at timestamptz,
  paid_by_email text,
  payment_reference text,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_remittance_period_check check (period_end >= period_start),
  constraint client_remittance_status_check check (lower(status) in ('draft','approved','paid','void')),
  constraint client_remittance_processor_payer_check check (lower(processor_fee_payer) in ('client','agency'))
);

create table if not exists public.client_remittance_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.client_remittance_batches(id) on delete cascade,
  payment_ledger_id text not null,
  account_id text,
  consumer_name text,
  account_number text,
  payment_date date,
  payment_type text,
  payment_method text,
  gross_amount numeric(14,2) not null default 0,
  signed_amount numeric(14,2) not null default 0,
  processor_fee numeric(14,2) not null default 0,
  released boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists client_fee_schedules_client_idx on public.client_fee_schedules(lower(client_email),lower(portfolio_name));
create index if not exists client_remittance_batches_client_idx on public.client_remittance_batches(lower(client_email),period_end desc);
create index if not exists client_remittance_batches_portfolio_idx on public.client_remittance_batches(lower(portfolio_name),period_end desc);
create index if not exists client_remittance_items_batch_idx on public.client_remittance_items(batch_id);
create unique index if not exists client_remittance_items_active_payment_idx on public.client_remittance_items(payment_ledger_id) where released=false;

alter table public.client_fee_schedules enable row level security;
alter table public.client_remittance_batches enable row level security;
alter table public.client_remittance_items enable row level security;

do $$
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_fee_schedules' and policyname='cpcm_remit_fee_admin_all') then
    create policy cpcm_remit_fee_admin_all on public.client_fee_schedules for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_batches' and policyname='cpcm_remit_batch_select') then
    create policy cpcm_remit_batch_select on public.client_remittance_batches for select to authenticated
      using (
        lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
        or (lower(client_email)=lower(coalesce(auth.jwt()->>'email','')) and lower(status) in ('approved','paid'))
      );
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_batches' and policyname='cpcm_remit_batch_admin_write') then
    create policy cpcm_remit_batch_admin_write on public.client_remittance_batches for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_items' and policyname='cpcm_remit_item_select') then
    create policy cpcm_remit_item_select on public.client_remittance_items for select to authenticated
      using (exists(
        select 1 from public.client_remittance_batches b
        where b.id=client_remittance_items.batch_id
          and (
            lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
            or (lower(b.client_email)=lower(coalesce(auth.jwt()->>'email','')) and lower(b.status) in ('approved','paid'))
          )
      ));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_items' and policyname='cpcm_remit_item_admin_write') then
    create policy cpcm_remit_item_admin_write on public.client_remittance_items for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
end $$;

create or replace function public.cpcm_admin_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); result jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  select jsonb_build_object(
    'clients',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'contact_name',u.client_contact_name,
      'company_name',u.client_company_name,'enabled',u.client_portal_enabled,
      'approved',u.is_approved,'active',u.is_active
    ) order by lower(coalesce(u.client_company_name,u.full_name,u.email)))
      from public.app_users u where lower(coalesce(u.role,''))='client'),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'client_email',lower(c.client_email),'portfolio_name',c.portfolio_name
    ) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c),'[]'::jsonb),
    'fee_schedules',coalesce((select jsonb_agg(to_jsonb(f) order by lower(f.client_email),lower(f.portfolio_name)) from public.client_fee_schedules f),'[]'::jsonb),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (
      select * from public.client_remittance_batches order by created_at desc limit 500
    ) b),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_fee_schedule(
  target_client_email text,
  target_portfolio_name text,
  new_agency_fee_percent numeric,
  new_processor_fee_percent numeric,
  new_processor_fee_fixed numeric,
  new_processor_fee_payer text,
  new_remittance_frequency text,
  new_payment_terms_days integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  payer text:=lower(trim(coalesce(new_processor_fee_payer,'client')));
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if coalesce(new_agency_fee_percent,0)<0 or coalesce(new_agency_fee_percent,0)>100 then raise exception 'agency fee must be between 0 and 100'; end if;
  if coalesce(new_processor_fee_percent,0)<0 or coalesce(new_processor_fee_percent,0)>100 then raise exception 'processor fee percent must be between 0 and 100'; end if;
  if payer not in ('client','agency') then raise exception 'processor fee payer must be client or agency'; end if;

  insert into public.client_fee_schedules(
    client_email,portfolio_name,agency_fee_percent,processor_fee_percent,processor_fee_fixed,
    processor_fee_payer,remittance_frequency,payment_terms_days,is_active,created_by_email,updated_at
  ) values(
    target,portfolio,round(coalesce(new_agency_fee_percent,0),4),round(coalesce(new_processor_fee_percent,0),4),
    round(coalesce(new_processor_fee_fixed,0),2),payer,coalesce(nullif(trim(new_remittance_frequency),''),'Monthly'),
    greatest(0,least(365,coalesce(new_payment_terms_days,10))),true,actor,now()
  )
  on conflict(client_email,portfolio_name) do update set
    agency_fee_percent=excluded.agency_fee_percent,
    processor_fee_percent=excluded.processor_fee_percent,
    processor_fee_fixed=excluded.processor_fee_fixed,
    processor_fee_payer=excluded.processor_fee_payer,
    remittance_frequency=excluded.remittance_frequency,
    payment_terms_days=excluded.payment_terms_days,
    is_active=true,
    updated_at=now();

  return jsonb_build_object('ok',true,'client_email',target,'portfolio_name',portfolio);
end $$;

create or replace function public.cpcm_admin_preview_remittance(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  fee_pct numeric:=30;
  proc_pct numeric:=0;
  proc_fixed numeric:=0;
  proc_payer text:='client';
  frequency_name text:='Monthly';
  terms_days integer:=10;
  gross numeric:=0;
  reversal_total numeric:=0;
  net_total numeric:=0;
  processor_total numeric:=0;
  agency_total numeric:=0;
  client_processor_deduction numeric:=0;
  final_total numeric:=0;
  items_json jsonb:='[]'::jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if period_start_date is null or period_end_date is null or period_end_date<period_start_date then raise exception 'valid period dates are required'; end if;
  if not exists(select 1 from public.client_portfolio_assignments c where lower(c.client_email)=target and lower(trim(c.portfolio_name))=lower(portfolio)) then
    raise exception 'portfolio is not assigned to this client';
  end if;

  select f.agency_fee_percent,f.processor_fee_percent,f.processor_fee_fixed,lower(f.processor_fee_payer),f.remittance_frequency,f.payment_terms_days
  into fee_pct,proc_pct,proc_fixed,proc_payer,frequency_name,terms_days
  from public.client_fee_schedules f
  where lower(f.client_email)=target and lower(trim(f.portfolio_name))=lower(portfolio) and f.is_active=true
  limit 1;

  fee_pct:=coalesce(fee_pct,30); proc_pct:=coalesce(proc_pct,0); proc_fixed:=coalesce(proc_fixed,0);
  proc_payer:=coalesce(proc_payer,'client'); frequency_name:=coalesce(frequency_name,'Monthly'); terms_days:=coalesce(terms_days,10);

  with eligible as (
    select
      l.id::text payment_ledger_id,
      a.id::text account_id,
      coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name)),'Consumer') consumer_name,
      coalesce(a.account_number,a.client_account_number,a.source_account_id,'') account_number,
      l.payment_date,
      coalesce(l.payment_type,'Payment') payment_type,
      coalesce(l.payment_method,'Other') payment_method,
      abs(coalesce(l.amount,0)) gross_amount,
      case when lower(coalesce(l.payment_type,'payment')) in ('reversal','adjustment debit') then -abs(coalesce(l.amount,0)) else abs(coalesce(l.amount,0)) end signed_amount,
      case
        when lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') then
          case when coalesce(l.processor_fee,0)>0 then round(l.processor_fee,2)
               else round((abs(coalesce(l.amount,0))*proc_pct/100)+proc_fixed,2) end
        else 0
      end processor_fee,
      l.created_at
    from public.payments_ledger l
    join public.accounts a on a.id=l.account_id
    where lower(trim(coalesce(a.portfolio,'')))=lower(portfolio)
      and l.payment_date between period_start_date and period_end_date
      and lower(coalesce(l.status,''))='completed'
      and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit','reversal','adjustment debit')
      and not exists(
        select 1 from public.client_remittance_items ri
        where ri.payment_ledger_id=l.id::text and ri.released=false
      )
  )
  select
    coalesce(sum(case when signed_amount>0 then signed_amount else 0 end),0),
    coalesce(sum(case when signed_amount<0 then abs(signed_amount) else 0 end),0),
    coalesce(sum(processor_fee),0),
    coalesce(jsonb_agg(jsonb_build_object(
      'payment_ledger_id',payment_ledger_id,'account_id',account_id,'consumer_name',consumer_name,
      'account_number',account_number,'payment_date',payment_date,'payment_type',payment_type,
      'payment_method',payment_method,'gross_amount',gross_amount,'signed_amount',signed_amount,
      'processor_fee',processor_fee
    ) order by payment_date,created_at),'[]'::jsonb)
  into gross,reversal_total,processor_total,items_json
  from eligible;

  net_total:=round(gross-reversal_total,2);
  agency_total:=round(greatest(net_total,0)*fee_pct/100,2);
  client_processor_deduction:=case when proc_payer='client' then processor_total else 0 end;
  final_total:=round(net_total-agency_total-client_processor_deduction+coalesce(manual_adjustment,0),2);

  return jsonb_build_object(
    'client_email',target,'portfolio_name',portfolio,'period_start',period_start_date,'period_end',period_end_date,
    'payment_count',jsonb_array_length(items_json),'gross_collections',round(gross,2),'reversals',round(reversal_total,2),
    'net_collections',round(net_total,2),'agency_fee_percent',round(fee_pct,4),'agency_fee_amount',round(agency_total,2),
    'processor_fee_percent',round(proc_pct,4),'processor_fee_fixed',round(proc_fixed,2),'processor_fees',round(processor_total,2),
    'processor_fee_payer',proc_payer,'client_processor_deduction',round(client_processor_deduction,2),
    'adjustments',round(coalesce(manual_adjustment,0),2),'net_remittance',round(final_total,2),
    'remittance_frequency',frequency_name,'payment_terms_days',terms_days,
    'suggested_due_date',period_end_date+terms_days,'items',items_json
  );
end $$;

create or replace function public.cpcm_admin_create_remittance_batch(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric,
  remittance_due_date date,
  batch_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  preview jsonb;
  new_batch public.client_remittance_batches%rowtype;
  item_record record;
  company_name text;
  number_value text;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  preview:=public.cpcm_admin_preview_remittance(target_client_email,target_portfolio_name,period_start_date,period_end_date,manual_adjustment);
  if coalesce((preview->>'payment_count')::integer,0)=0 then raise exception 'no unbatched completed payments were found for this period'; end if;

  select coalesce(nullif(trim(client_company_name),''),nullif(trim(full_name),''),lower(email)) into company_name
  from public.app_users where lower(email)=lower(trim(target_client_email)) limit 1;
  number_value:='REM-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.client_remittance_batches(
    batch_number,client_email,client_company_name,portfolio_name,period_start,period_end,payment_count,
    gross_collections,reversals,net_collections,agency_fee_percent,agency_fee_amount,processor_fees,
    processor_fee_payer,adjustments,net_remittance,status,due_date,notes,created_by_email,updated_at
  ) values(
    number_value,lower(trim(target_client_email)),company_name,trim(target_portfolio_name),period_start_date,period_end_date,
    (preview->>'payment_count')::integer,(preview->>'gross_collections')::numeric,(preview->>'reversals')::numeric,
    (preview->>'net_collections')::numeric,(preview->>'agency_fee_percent')::numeric,(preview->>'agency_fee_amount')::numeric,
    (preview->>'processor_fees')::numeric,preview->>'processor_fee_payer',(preview->>'adjustments')::numeric,
    (preview->>'net_remittance')::numeric,'Draft',coalesce(remittance_due_date,(preview->>'suggested_due_date')::date),
    nullif(trim(batch_notes),''),actor,now()
  ) returning * into new_batch;

  for item_record in select value item from jsonb_array_elements(preview->'items') loop
    insert into public.client_remittance_items(
      batch_id,payment_ledger_id,account_id,consumer_name,account_number,payment_date,payment_type,payment_method,
      gross_amount,signed_amount,processor_fee,released
    ) values(
      new_batch.id,item_record.item->>'payment_ledger_id',item_record.item->>'account_id',item_record.item->>'consumer_name',
      item_record.item->>'account_number',(item_record.item->>'payment_date')::date,item_record.item->>'payment_type',
      item_record.item->>'payment_method',(item_record.item->>'gross_amount')::numeric,(item_record.item->>'signed_amount')::numeric,
      (item_record.item->>'processor_fee')::numeric,false
    );
  end loop;

  return jsonb_build_object('ok',true,'batch',to_jsonb(new_batch));
end $$;

create or replace function public.cpcm_admin_update_remittance_batch(
  target_batch_id uuid,
  requested_action text,
  new_payment_reference text,
  new_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  current_batch public.client_remittance_batches%rowtype;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  select * into current_batch from public.client_remittance_batches where id=target_batch_id for update;
  if not found then raise exception 'remittance batch not found'; end if;

  if action_name='approve' then
    if lower(current_batch.status)<>'draft' then raise exception 'only a draft batch can be approved'; end if;
    update public.client_remittance_batches set status='Approved',approved_at=now(),approved_by_email=actor,
      notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now() where id=target_batch_id;
  elsif action_name='paid' then
    if lower(current_batch.status)<>'approved' then raise exception 'approve the batch before marking it paid'; end if;
    update public.client_remittance_batches set status='Paid',paid_at=now(),paid_by_email=actor,
      payment_reference=nullif(trim(new_payment_reference),''),notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where id=target_batch_id;
  elsif action_name='draft' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot return to draft'; end if;
    update public.client_remittance_batches set status='Draft',approved_at=null,approved_by_email=null,updated_at=now()
      where id=target_batch_id;
  elsif action_name='void' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot be voided'; end if;
    update public.client_remittance_batches set status='Void',notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where id=target_batch_id;
    update public.client_remittance_items set released=true where batch_id=target_batch_id;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select * into current_batch from public.client_remittance_batches where id=target_batch_id;
  return jsonb_build_object('ok',true,'batch',to_jsonb(current_batch));
end $$;

create or replace function public.cpcm_remittance_batch_detail(target_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  selected_batch public.client_remittance_batches%rowtype;
  is_admin boolean:=actor='afinch2678@gmail.com';
begin
  select * into selected_batch from public.client_remittance_batches where id=target_batch_id limit 1;
  if not found then raise exception 'remittance batch not found'; end if;
  if not is_admin and not (lower(selected_batch.client_email)=actor and lower(selected_batch.status) in ('approved','paid')) then
    raise exception 'not authorized for this remittance statement';
  end if;
  return jsonb_build_object(
    'batch',to_jsonb(selected_batch),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.payment_date,i.consumer_name) from public.client_remittance_items i where i.batch_id=target_batch_id),'[]'::jsonb)
  );
end $$;

create or replace function public.cpcm_client_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  profile_row public.app_users%rowtype;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false)
     or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then
    raise exception 'client portal access is not approved';
  end if;

  return jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'company_name',profile_row.client_company_name,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object(
      'pending_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where lower(client_email)=actor and lower(status)='approved'),0),
      'paid_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where lower(client_email)=actor and lower(status)='paid'),0),
      'agency_fees',coalesce((select sum(agency_fee_amount) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'processor_fees',coalesce((select sum(processor_fees) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'statement_count',coalesce((select count(*) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'last_remittance_date',(select max(coalesce(paid_at,approved_at,created_at)) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid'))
    ),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.period_end desc,b.created_at desc) from (
      select * from public.client_remittance_batches
      where lower(client_email)=actor and lower(status) in ('approved','paid')
      order by period_end desc,created_at desc limit 100
    ) b),'[]'::jsonb)
  );
end $$;

revoke all on function public.cpcm_admin_remittance_snapshot() from public;
revoke all on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) from public;
revoke all on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) from public;
revoke all on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) from public;
revoke all on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) from public;
revoke all on function public.cpcm_remittance_batch_detail(uuid) from public;
revoke all on function public.cpcm_client_remittance_snapshot() from public;

grant select on public.client_fee_schedules,public.client_remittance_batches,public.client_remittance_items to authenticated;
grant execute on function public.cpcm_admin_remittance_snapshot() to authenticated;
grant execute on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) to authenticated;
grant execute on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) to authenticated;
grant execute on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) to authenticated;
grant execute on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) to authenticated;
grant execute on function public.cpcm_remittance_batch_detail(uuid) to authenticated;
grant execute on function public.cpcm_client_remittance_snapshot() to authenticated;

notify pgrst,'reload schema';


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_DYNAMIC_ACTIVITY_STATS_CALL_DEDUPE_R8N11.sql
============================================================================================

-- CO PILOT COLLECTIONS MANAGER
-- DYNAMIC ACTIVITY + CALL STATISTICS R8N11
-- Run once in the matching Supabase project after deploying the matching ZIP.
-- Safe to run more than once.

begin;

alter table if exists public.accounts
  add column if not exists last_called_at timestamptz,
  add column if not exists last_call_result text,
  add column if not exists last_call_outcome text,
  add column if not exists next_call_at timestamptz,
  add column if not exists call_count integer not null default 0,
  add column if not exists contact_count integer not null default 0,
  add column if not exists rpc_count integer not null default 0,
  add column if not exists voicemail_count integer not null default 0,
  add column if not exists no_answer_count integer not null default 0,
  add column if not exists wrong_number_count integer not null default 0,
  add column if not exists refused_count integer not null default 0,
  add column if not exists last_worked_at timestamptz,
  add column if not exists do_not_call boolean not null default false,
  add column if not exists disputed_flag boolean not null default false,
  add column if not exists wrong_number_flag boolean not null default false;

alter table if exists public.call_results
  add column if not exists attempt_id text,
  add column if not exists attempt_status text not null default 'completed',
  add column if not exists event_type text not null default 'result',
  add column if not exists dialed_at timestamptz,
  add column if not exists direction text,
  add column if not exists outcome_category text,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists answered_by text,
  add column if not exists is_contact boolean not null default false,
  add column if not exists is_rpc boolean not null default false,
  add column if not exists is_promise boolean not null default false,
  add column if not exists is_callback boolean not null default false,
  add column if not exists is_wrong_number boolean not null default false,
  add column if not exists next_call_at timestamptz,
  add column if not exists account_balance_snapshot numeric not null default 0,
  add column if not exists call_source text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.activity_logs
  add column if not exists event_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_call_results_attempt_id_unique
  on public.call_results(attempt_id)
  where attempt_id is not null;

create unique index if not exists idx_activity_logs_event_key_unique
  on public.activity_logs(event_key)
  where event_key is not null;

create index if not exists idx_call_results_created_by_created_at
  on public.call_results(created_by_email, created_at desc);
create index if not exists idx_call_results_account_created_at
  on public.call_results(account_id, created_at desc);
create index if not exists idx_activity_logs_created_by_created_at
  on public.activity_logs(created_by_email, created_at desc);

create or replace function public.cpcm_record_call_attempt(
  p_account_id uuid,
  p_phone_number text,
  p_attempt_id text,
  p_created_by_email text default null,
  p_call_source text default 'Phone Link'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_call_id uuid;
  v_email text := lower(coalesce(nullif(auth.jwt()->>'email',''), nullif(p_created_by_email,''), 'unknown'));
  v_count integer := 0;
  v_inserted boolean := false;
begin
  insert into public.call_results(
    account_id, phone_number, call_result, disposition, notes,
    result_at, created_by_email, created_at,
    attempt_id, attempt_status, event_type, dialed_at,
    direction, outcome_category, call_source, updated_at
  ) values (
    p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
    'Call Attempt', 'Pending Outcome', 'Phone application launched from Co Pilot Collections Manager.',
    v_now, v_email, v_now,
    p_attempt_id, 'pending', 'attempt', v_now,
    'Outbound', 'Pending Outcome', coalesce(nullif(p_call_source,''),'Phone Link'), v_now
  )
  on conflict do nothing
  returning id into v_call_id;

  if v_call_id is not null then
    v_inserted := true;

    update public.accounts
       set last_contact_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           last_called_at = v_now,
           call_count = coalesce(call_count,0) + 1,
           last_worked_at = v_now,
           updated_at = v_now
     where id = p_account_id
     returning call_count into v_count;

    insert into public.activity_logs(
      account_id, action_type, action_text, phone_number,
      created_by_email, created_at, event_key, metadata
    ) values (
      p_account_id, 'Call Attempt',
      'Outbound call attempt launched to ' || regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      v_email, v_now, 'call-attempt:' || p_attempt_id,
      jsonb_build_object('attempt_id',p_attempt_id,'source',coalesce(nullif(p_call_source,''),'Phone Link'))
    ) on conflict do nothing;
  else
    select id into v_call_id
      from public.call_results
     where attempt_id = p_attempt_id
     order by created_at desc
     limit 1;
    select coalesce(call_count,0) into v_count from public.accounts where id=p_account_id;
  end if;

  return jsonb_build_object(
    'call_result_id', v_call_id,
    'attempt_id', p_attempt_id,
    'dialed_at', v_now,
    'call_count', coalesce(v_count,0),
    'inserted', v_inserted
  );
end;
$$;

create or replace function public.cpcm_complete_call_attempt(
  p_account_id uuid,
  p_attempt_id text,
  p_phone_number text,
  p_call_result text,
  p_disposition text,
  p_direction text default 'Outbound',
  p_outcome_category text default 'No Contact',
  p_duration_seconds integer default 0,
  p_answered_by text default null,
  p_is_contact boolean default false,
  p_is_rpc boolean default false,
  p_is_promise boolean default false,
  p_is_callback boolean default false,
  p_is_wrong_number boolean default false,
  p_next_call_at timestamptz default null,
  p_account_balance_snapshot numeric default 0,
  p_notes text default null,
  p_created_by_email text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_call_id uuid;
  v_existing_status text;
  v_email text := lower(coalesce(nullif(auth.jwt()->>'email',''), nullif(p_created_by_email,''), 'unknown'));
  v_new_call boolean := false;
  v_duplicate boolean := false;
begin
  if p_attempt_id is not null and p_attempt_id <> '' then
    select id, attempt_status
      into v_call_id, v_existing_status
      from public.call_results
     where attempt_id = p_attempt_id
     order by created_at desc
     limit 1
     for update;
  end if;

  if v_call_id is not null and coalesce(v_existing_status,'pending') = 'completed' then
    v_duplicate := true;
  elsif v_call_id is not null then
    update public.call_results
       set phone_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           call_result = coalesce(nullif(p_call_result,''),'No Answer'),
           disposition = coalesce(nullif(p_disposition,''),coalesce(nullif(p_call_result,''),'No Answer')),
           notes = p_notes,
           result_at = v_now,
           attempt_status = 'completed',
           event_type = 'result',
           direction = coalesce(nullif(p_direction,''),'Outbound'),
           outcome_category = coalesce(nullif(p_outcome_category,''),'No Contact'),
           duration_seconds = greatest(coalesce(p_duration_seconds,0),0),
           answered_by = p_answered_by,
           is_contact = coalesce(p_is_contact,false),
           is_rpc = coalesce(p_is_rpc,false),
           is_promise = coalesce(p_is_promise,false),
           is_callback = coalesce(p_is_callback,false),
           is_wrong_number = coalesce(p_is_wrong_number,false),
           next_call_at = p_next_call_at,
           account_balance_snapshot = coalesce(p_account_balance_snapshot,0),
           call_source = coalesce(nullif(call_source,''),'Phone Link'),
           updated_at = v_now
     where id = v_call_id;
  else
    v_new_call := true;
    insert into public.call_results(
      account_id, phone_number, call_result, disposition, notes,
      result_at, created_by_email, created_at,
      attempt_id, attempt_status, event_type, dialed_at,
      direction, outcome_category, duration_seconds, answered_by,
      is_contact, is_rpc, is_promise, is_callback, is_wrong_number,
      next_call_at, account_balance_snapshot, call_source, updated_at
    ) values (
      p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      coalesce(nullif(p_call_result,''),'No Answer'),
      coalesce(nullif(p_disposition,''),coalesce(nullif(p_call_result,''),'No Answer')),
      p_notes, v_now, v_email, v_now,
      coalesce(nullif(p_attempt_id,''),'result-'||gen_random_uuid()::text),
      'completed','result',v_now,
      coalesce(nullif(p_direction,''),'Outbound'),
      coalesce(nullif(p_outcome_category,''),'No Contact'),
      greatest(coalesce(p_duration_seconds,0),0),p_answered_by,
      coalesce(p_is_contact,false),coalesce(p_is_rpc,false),coalesce(p_is_promise,false),
      coalesce(p_is_callback,false),coalesce(p_is_wrong_number,false),
      p_next_call_at,coalesce(p_account_balance_snapshot,0),'Manual Call Result',v_now
    ) returning id into v_call_id;
  end if;

  if not v_duplicate then
    update public.accounts
       set status = coalesce(nullif(p_disposition,''),status),
           disposition = coalesce(nullif(p_disposition,''),disposition),
           last_contact_number = regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
           last_called_at = v_now,
           last_call_result = coalesce(nullif(p_call_result,''),'No Answer'),
           last_call_outcome = coalesce(nullif(p_outcome_category,''),'No Contact'),
           next_call_at = p_next_call_at,
           call_count = coalesce(call_count,0) + case when v_new_call then 1 else 0 end,
           contact_count = coalesce(contact_count,0) + case when coalesce(p_is_contact,false) then 1 else 0 end,
           rpc_count = coalesce(rpc_count,0) + case when coalesce(p_is_rpc,false) then 1 else 0 end,
           voicemail_count = coalesce(voicemail_count,0) + case when lower(coalesce(p_call_result,'')) like '%voicemail%' then 1 else 0 end,
           no_answer_count = coalesce(no_answer_count,0) + case when lower(coalesce(p_call_result,'')) = 'no answer' then 1 else 0 end,
           wrong_number_count = coalesce(wrong_number_count,0) + case when coalesce(p_is_wrong_number,false) then 1 else 0 end,
           refused_count = coalesce(refused_count,0) + case when lower(coalesce(p_call_result,'')) = 'refused to pay' then 1 else 0 end,
           do_not_call = case when lower(coalesce(p_call_result,''))='dnc' then true else do_not_call end,
           disputed_flag = case when lower(coalesce(p_call_result,''))='dispute' then true else disputed_flag end,
           wrong_number_flag = case when coalesce(p_is_wrong_number,false) then true else wrong_number_flag end,
           last_worked_at = v_now,
           updated_at = v_now
     where id = p_account_id;

    insert into public.activity_logs(
      account_id, action_type, action_text, phone_number,
      old_status, new_status, created_by_email, created_at,
      event_key, metadata
    ) values (
      p_account_id, 'Call Result',
      coalesce(nullif(p_call_result,''),'No Answer') ||
        case when coalesce(p_notes,'')<>'' then '. '||p_notes else '' end,
      regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      null,coalesce(nullif(p_disposition,''),p_call_result),v_email,v_now,
      'call-result:'||coalesce(nullif(p_attempt_id,''),v_call_id::text),
      jsonb_build_object('attempt_id',p_attempt_id,'call_result_id',v_call_id,'outcome_category',p_outcome_category)
    ) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'call_result_id',v_call_id,
    'attempt_id',p_attempt_id,
    'completed',not v_duplicate,
    'duplicate',v_duplicate,
    'created_without_attempt',v_new_call,
    'result_at',v_now
  );
end;
$$;

grant execute on function public.cpcm_record_call_attempt(uuid,text,text,text,text) to authenticated;
grant execute on function public.cpcm_complete_call_attempt(uuid,text,text,text,text,text,text,integer,text,boolean,boolean,boolean,boolean,boolean,timestamptz,numeric,text,text) to authenticated;

commit;


============================================================================================
-- ORIGINAL MIGRATION: RUN_THIS_NMI_ADMIN_APPROVAL_QUEUE_R8N17.sql
============================================================================================

-- CO PILOT COLLECTIONS MANAGER - LIVE NMI EMPLOYEE/ADMIN APPROVAL QUEUE (R8N17)
-- Administrator-only card sales, employee payment approval requests, NMI refunds/voids,
-- secure temporary Customer Vault references, ledger/balance updates, audit trail,
-- payment-plan allocation, webhook reconciliation, and duplicate protection.
-- Run once in the LIVE Supabase SQL Editor after the prior LIVE migrations.

create extension if not exists pgcrypto;

begin;

-- Ensure the existing payment tables have the columns this integration uses.
alter table public.accounts
  add column if not exists current_balance numeric(14,2),
  add column if not exists status text,
  add column if not exists updated_at timestamptz default now();

alter table public.payments_ledger
  add column if not exists payment_date date,
  add column if not exists amount numeric(14,2),
  add column if not exists payment_type text default 'Payment',
  add column if not exists payment_method text default 'Other',
  add column if not exists processor_fee numeric(14,2) not null default 0,
  add column if not exists status text default 'Completed',
  add column if not exists receipt_number text,
  add column if not exists balance_before numeric(14,2),
  add column if not exists balance_after numeric(14,2),
  add column if not exists notes text,
  add column if not exists created_by_email text,
  add column if not exists plan_payment_id uuid,
  add column if not exists gateway_provider text,
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_parent_transaction_id text,
  add column if not exists gateway_status text,
  add column if not exists gateway_response jsonb not null default '{}'::jsonb,
  add column if not exists authorization_code text,
  add column if not exists card_brand text,
  add column if not exists card_last4 text,
  add column if not exists idempotency_key text,
  add column if not exists refunded_amount numeric(14,2) not null default 0,
  add column if not exists voided_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.payment_plans
  add column if not exists remaining_amount numeric(14,2) default 0,
  add column if not exists status text default 'Active',
  add column if not exists updated_at timestamptz default now();

alter table public.payment_plan_payments
  add column if not exists plan_id uuid,
  add column if not exists payment_plan_id uuid,
  add column if not exists amount numeric(14,2) default 0,
  add column if not exists payment_amount numeric(14,2) default 0,
  add column if not exists account_id uuid,
  add column if not exists due_date date,
  add column if not exists amount_due numeric(14,2) default 0,
  add column if not exists amount_paid numeric(14,2) default 0,
  add column if not exists paid_date date,
  add column if not exists status text default 'Scheduled',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists payments_ledger_nmi_idempotency_uq
  on public.payments_ledger(idempotency_key)
  where idempotency_key is not null;
create index if not exists payments_ledger_nmi_gateway_idx
  on public.payments_ledger(gateway_provider, gateway_transaction_id);

create table if not exists public.nmi_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  ledger_id uuid references public.payments_ledger(id) on delete set null,
  parent_ledger_id uuid references public.payments_ledger(id) on delete set null,
  action text not null check (action in ('sale','refund','void')),
  idempotency_key text not null unique,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  status text not null default 'pending',
  gateway_transaction_id text,
  parent_gateway_transaction_id text,
  response_code text,
  response_text text,
  authorization_code text,
  card_brand text,
  card_last4 text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nmi_transactions_account_idx
  on public.nmi_transactions(account_id, created_at desc);
create index if not exists nmi_transactions_gateway_idx
  on public.nmi_transactions(gateway_transaction_id);

alter table public.nmi_transactions
  add column if not exists approval_request_id uuid,
  add column if not exists approved_by_email text;

create table if not exists public.payment_approval_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  balance_at_request numeric(14,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'vaulting' check (status in ('vaulting','pending','processing','approved','declined','cancelled','expired','gateway_declined','failed','needs_review')),
  idempotency_key text not null unique,
  nmi_customer_vault_id text,
  card_brand text,
  card_last4 text,
  cardholder_name text,
  billing_address1 text,
  billing_city text,
  billing_state text,
  billing_zip text,
  billing_email text,
  billing_phone text,
  consumer_name text,
  account_number text,
  authorization_confirmed boolean not null default false,
  authorization_notes text,
  request_metadata jsonb not null default '{}'::jsonb,
  requested_by_email text not null,
  reviewed_by_email text,
  reviewed_at timestamptz,
  decision_notes text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  nmi_transaction_id uuid references public.nmi_transactions(id) on delete set null,
  ledger_id uuid references public.payments_ledger(id) on delete set null,
  gateway_transaction_id text,
  vault_deleted_at timestamptz,
  vault_delete_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nmi_transactions
  drop constraint if exists nmi_transactions_approval_request_id_fkey;
alter table public.nmi_transactions
  add constraint nmi_transactions_approval_request_id_fkey
  foreign key (approval_request_id) references public.payment_approval_requests(id) on delete set null;

create unique index if not exists nmi_transactions_approval_request_uq
  on public.nmi_transactions(approval_request_id)
  where approval_request_id is not null and action='sale';
create index if not exists payment_approval_requests_status_idx
  on public.payment_approval_requests(status, created_at desc);
create index if not exists payment_approval_requests_requestor_idx
  on public.payment_approval_requests(lower(requested_by_email), created_at desc);
create index if not exists payment_approval_requests_account_idx
  on public.payment_approval_requests(account_id, created_at desc);

-- Approval requests contain a secure NMI Customer Vault reference. No browser role
-- receives direct table access; the protected nmi-payments Edge Function returns
-- sanitized request summaries and enforces all actions server-side.
alter table public.payment_approval_requests enable row level security;
revoke all on public.payment_approval_requests from anon, authenticated;


create table if not exists public.nmi_plan_allocations (
  id uuid primary key default gen_random_uuid(),
  nmi_transaction_id uuid not null references public.nmi_transactions(id) on delete cascade,
  ledger_id uuid not null references public.payments_ledger(id) on delete cascade,
  payment_plan_id uuid references public.payment_plans(id) on delete set null,
  payment_plan_payment_id uuid references public.payment_plan_payments(id) on delete set null,
  applied_amount numeric(14,2) not null default 0,
  reversed_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nmi_plan_allocations_ledger_idx
  on public.nmi_plan_allocations(ledger_id, created_at desc);

create table if not exists public.nmi_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text,
  gateway_transaction_id text,
  signature_verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received',
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Read access is limited. All writes occur through the protected Edge Functions.
alter table public.nmi_transactions enable row level security;
alter table public.nmi_plan_allocations enable row level security;
alter table public.nmi_webhook_events enable row level security;

drop policy if exists cpcm_nmi_transactions_select on public.nmi_transactions;
create policy cpcm_nmi_transactions_select on public.nmi_transactions
for select to authenticated using (
  lower(created_by_email)=lower(coalesce(auth.jwt()->>'email',''))
  or exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='admin'
      and coalesce(u.is_approved,true)=true
      and coalesce(u.is_active,true)=true
  )
  or lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
);

drop policy if exists cpcm_nmi_allocations_select on public.nmi_plan_allocations;
create policy cpcm_nmi_allocations_select on public.nmi_plan_allocations
for select to authenticated using (
  exists (
    select 1 from public.nmi_transactions t
    where t.id=nmi_transaction_id
      and (
        lower(t.created_by_email)=lower(coalesce(auth.jwt()->>'email',''))
        or lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
        or exists (
          select 1 from public.app_users u
          where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
            and lower(coalesce(u.role,''))='admin'
            and coalesce(u.is_approved,true)=true
            and coalesce(u.is_active,true)=true
        )
      )
  )
);

drop policy if exists cpcm_nmi_webhooks_admin_select on public.nmi_webhook_events;
create policy cpcm_nmi_webhooks_admin_select on public.nmi_webhook_events
for select to authenticated using (
  lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
  or exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='admin'
      and coalesce(u.is_approved,true)=true
      and coalesce(u.is_active,true)=true
  )
);

-- Finalize an NMI-approved sale atomically.
create or replace function public.cpcm_nmi_finalize_sale(
  p_nmi_transaction_id uuid,
  p_gateway_transaction_id text,
  p_gateway_status text,
  p_response_payload jsonb default '{}'::jsonb,
  p_response_code text default null,
  p_response_text text default null,
  p_authorization_code text default null,
  p_card_brand text default null,
  p_card_last4 text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  tx public.nmi_transactions%rowtype;
  acct public.accounts%rowtype;
  ledger_row public.payments_ledger%rowtype;
  plan_row public.payment_plans%rowtype;
  installment record;
  bal_before numeric(14,2);
  bal_after numeric(14,2);
  remaining_to_apply numeric(14,2);
  due_left numeric(14,2);
  apply_now numeric(14,2);
  receipt text;
begin
  select * into tx from public.nmi_transactions where id=p_nmi_transaction_id for update;
  if not found then raise exception 'NMI transaction not found'; end if;
  if tx.action <> 'sale' then raise exception 'Transaction is not a sale'; end if;

  if tx.ledger_id is not null then
    select * into ledger_row from public.payments_ledger where id=tx.ledger_id;
    return jsonb_build_object(
      'already_finalized',true,'ledger_id',ledger_row.id,'receipt_number',ledger_row.receipt_number,
      'balance_before',ledger_row.balance_before,'balance_after',ledger_row.balance_after,
      'gateway_transaction_id',ledger_row.gateway_transaction_id
    );
  end if;

  select * into acct from public.accounts where id=tx.account_id for update;
  if not found then raise exception 'Account not found'; end if;

  bal_before := greatest(0,coalesce(acct.current_balance,acct.principal,acct.original_balance,0));
  if tx.amount > bal_before + 0.01 then
    raise exception 'Approved amount exceeds current account balance';
  end if;
  bal_after := greatest(0,round((bal_before-tx.amount)::numeric,2));
  receipt := 'NMI-' || upper(substr(regexp_replace(coalesce(p_gateway_transaction_id,tx.id::text),'[^a-zA-Z0-9]','','g'),1,18));

  insert into public.payments_ledger(
    account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,
    balance_before,balance_after,notes,created_by_email,gateway_provider,
    gateway_transaction_id,gateway_status,gateway_response,authorization_code,
    card_brand,card_last4,idempotency_key,created_at,updated_at
  ) values (
    tx.account_id,current_date,tx.amount,'Payment','Card - NMI','Completed',receipt,
    bal_before,bal_after,'Secure one-time card payment processed through NMI.',tx.created_by_email,'NMI',
    p_gateway_transaction_id,coalesce(p_gateway_status,'Approved'),coalesce(p_response_payload,'{}'::jsonb),
    p_authorization_code,p_card_brand,p_card_last4,tx.idempotency_key,now(),now()
  ) returning * into ledger_row;

  remaining_to_apply := tx.amount;
  select * into plan_row
  from public.payment_plans
  where account_id=tx.account_id
    and lower(coalesce(status,'active')) not in ('paid','cancelled','canceled','closed')
  order by created_at desc
  limit 1
  for update;

  if found then
    for installment in
      select * from public.payment_plan_payments
      where account_id=tx.account_id
        and (plan_id=plan_row.id or payment_plan_id=plan_row.id)
        and lower(coalesce(status,'scheduled')) not in ('paid','cancelled','canceled')
        and coalesce(amount_due,amount,payment_amount,0) > coalesce(amount_paid,0)
      order by due_date asc nulls last, created_at asc
      for update
    loop
      exit when remaining_to_apply <= 0;
      due_left := greatest(0,coalesce(installment.amount_due,installment.amount,installment.payment_amount,0)-coalesce(installment.amount_paid,0));
      apply_now := least(due_left,remaining_to_apply);
      if apply_now > 0 then
        update public.payment_plan_payments
        set amount_paid=round((coalesce(amount_paid,0)+apply_now)::numeric,2),
            paid_date=case when coalesce(amount_paid,0)+apply_now+0.01 >= coalesce(amount_due,amount,payment_amount,0) then current_date else paid_date end,
            status=case when coalesce(amount_paid,0)+apply_now+0.01 >= coalesce(amount_due,amount,payment_amount,0) then 'Paid' else 'Partial' end,
            updated_at=now()
        where id=installment.id;

        insert into public.nmi_plan_allocations(
          nmi_transaction_id,ledger_id,payment_plan_id,payment_plan_payment_id,applied_amount
        ) values (tx.id,ledger_row.id,plan_row.id,installment.id,apply_now);
        remaining_to_apply := round((remaining_to_apply-apply_now)::numeric,2);
      end if;
    end loop;

    update public.payment_plans
    set remaining_amount=greatest(0,round((coalesce(remaining_amount,total_amount,0)-(tx.amount-remaining_to_apply))::numeric,2)),
        status=case when greatest(0,coalesce(remaining_amount,total_amount,0)-(tx.amount-remaining_to_apply)) <= 0.01 then 'Paid' else 'Active' end,
        updated_at=now()
    where id=plan_row.id;
  end if;

  update public.accounts
  set current_balance=bal_after,
      status=case when bal_after <= 0.01 then 'Settled' else coalesce(status,'Active') end,
      updated_at=now()
  where id=tx.account_id;

  update public.nmi_transactions
  set ledger_id=ledger_row.id,status='approved',gateway_transaction_id=p_gateway_transaction_id,
      response_code=p_response_code,response_text=p_response_text,authorization_code=p_authorization_code,
      card_brand=p_card_brand,card_last4=p_card_last4,response_payload=coalesce(p_response_payload,'{}'::jsonb),updated_at=now()
  where id=tx.id;

  insert into public.activity_logs(account_id,action_type,action_text,created_by_email,created_at)
  values(tx.account_id,'NMI Payment','Approved NMI card payment of $'||to_char(tx.amount,'FM999999990.00')||'. Receipt '||receipt||'.',tx.created_by_email,now());

  insert into public.audit_logs(action_type,action_text,target_type,target_id,created_by_email)
  values('NMI Payment Approved','NMI transaction '||coalesce(p_gateway_transaction_id,'')||' applied to account balance.','payments_ledger',ledger_row.id::text,tx.created_by_email);

  return jsonb_build_object(
    'ledger_id',ledger_row.id,'receipt_number',receipt,'balance_before',bal_before,'balance_after',bal_after,
    'amount',tx.amount,'gateway_transaction_id',p_gateway_transaction_id,
    'card_brand',p_card_brand,'card_last4',p_card_last4
  );
end;
$$;

-- Apply an approved NMI void/refund atomically and reverse plan allocation.
create or replace function public.cpcm_nmi_apply_adjustment(
  p_nmi_transaction_id uuid,
  p_gateway_transaction_id text,
  p_gateway_status text,
  p_response_payload jsonb default '{}'::jsonb,
  p_response_code text default null,
  p_response_text text default null,
  p_authorization_code text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  tx public.nmi_transactions%rowtype;
  original public.payments_ledger%rowtype;
  acct public.accounts%rowtype;
  reversal public.payments_ledger%rowtype;
  allocation record;
  installment record;
  bal_before numeric(14,2);
  bal_after numeric(14,2);
  refundable numeric(14,2);
  remaining_to_reverse numeric(14,2);
  reverse_now numeric(14,2);
  next_paid numeric(14,2);
  receipt text;
begin
  select * into tx from public.nmi_transactions where id=p_nmi_transaction_id for update;
  if not found then raise exception 'NMI adjustment transaction not found'; end if;
  if tx.action not in ('refund','void') then raise exception 'Transaction is not a refund or void'; end if;

  if tx.ledger_id is not null then
    select * into reversal from public.payments_ledger where id=tx.ledger_id;
    return jsonb_build_object('already_finalized',true,'ledger_id',reversal.id,'balance_after',reversal.balance_after);
  end if;

  select * into original from public.payments_ledger where id=tx.parent_ledger_id for update;
  if not found or upper(coalesce(original.gateway_provider,'')) <> 'NMI' then
    raise exception 'Original NMI payment not found';
  end if;

  refundable := greatest(0,coalesce(original.amount,0)-coalesce(original.refunded_amount,0));
  if tx.amount > refundable + 0.01 then raise exception 'Adjustment exceeds refundable amount'; end if;

  select * into acct from public.accounts where id=original.account_id for update;
  if not found then raise exception 'Account not found'; end if;
  bal_before := greatest(0,coalesce(acct.current_balance,acct.principal,acct.original_balance,0));
  bal_after := round((bal_before+tx.amount)::numeric,2);
  receipt := upper(tx.action)||'-'||upper(substr(regexp_replace(coalesce(p_gateway_transaction_id,tx.id::text),'[^a-zA-Z0-9]','','g'),1,18));

  insert into public.payments_ledger(
    account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,
    balance_before,balance_after,notes,created_by_email,gateway_provider,gateway_transaction_id,
    gateway_parent_transaction_id,gateway_status,gateway_response,authorization_code,idempotency_key,created_at,updated_at
  ) values (
    original.account_id,current_date,tx.amount,'Reversal','Card - NMI','Completed',receipt,
    bal_before,bal_after,initcap(tx.action)||' of NMI payment '||coalesce(original.gateway_transaction_id,''),
    tx.created_by_email,'NMI',p_gateway_transaction_id,original.gateway_transaction_id,
    coalesce(p_gateway_status,initcap(tx.action)||' Approved'),coalesce(p_response_payload,'{}'::jsonb),
    p_authorization_code,tx.idempotency_key,now(),now()
  ) returning * into reversal;

  remaining_to_reverse := tx.amount;
  for allocation in
    select * from public.nmi_plan_allocations
    where ledger_id=original.id and applied_amount > reversed_amount
    order by created_at desc
    for update
  loop
    exit when remaining_to_reverse <= 0;
    reverse_now := least(allocation.applied_amount-allocation.reversed_amount,remaining_to_reverse);
    if reverse_now > 0 and allocation.payment_plan_payment_id is not null then
      select * into installment from public.payment_plan_payments where id=allocation.payment_plan_payment_id for update;
      if found then
        next_paid := greatest(0,coalesce(installment.amount_paid,0)-reverse_now);
        update public.payment_plan_payments
        set amount_paid=next_paid,
            paid_date=case when next_paid+0.01 >= coalesce(amount_due,amount,payment_amount,0) then paid_date else null end,
            status=case when next_paid<=0.01 then 'Scheduled' when next_paid+0.01 >= coalesce(amount_due,amount,payment_amount,0) then 'Paid' else 'Partial' end,
            updated_at=now()
        where id=installment.id;
      end if;
      update public.nmi_plan_allocations
      set reversed_amount=round((coalesce(reversed_amount,0)+reverse_now)::numeric,2),updated_at=now()
      where id=allocation.id;
      if allocation.payment_plan_id is not null then
        update public.payment_plans
        set remaining_amount=round((coalesce(remaining_amount,0)+reverse_now)::numeric,2),status='Active',updated_at=now()
        where id=allocation.payment_plan_id;
      end if;
      remaining_to_reverse := round((remaining_to_reverse-reverse_now)::numeric,2);
    end if;
  end loop;

  update public.accounts
  set current_balance=bal_after,
      status=case when bal_before<=0.01 and bal_after>0.01 and lower(coalesce(status,'')) in ('settled','paid') then 'Active' else status end,
      updated_at=now()
  where id=original.account_id;

  update public.payments_ledger
  set refunded_amount=round((coalesce(refunded_amount,0)+tx.amount)::numeric,2),
      gateway_status=case
        when tx.action='void' then 'Voided'
        when coalesce(refunded_amount,0)+tx.amount+0.01 >= coalesce(amount,0) then 'Refunded'
        else 'Partially Refunded' end,
      voided_at=case when tx.action='void' then now() else voided_at end,
      refunded_at=case when tx.action='refund' then now() else refunded_at end,
      updated_at=now()
  where id=original.id;

  update public.nmi_transactions
  set ledger_id=reversal.id,status='approved',gateway_transaction_id=p_gateway_transaction_id,
      response_code=p_response_code,response_text=p_response_text,authorization_code=p_authorization_code,
      response_payload=coalesce(p_response_payload,'{}'::jsonb),updated_at=now()
  where id=tx.id;

  insert into public.activity_logs(account_id,action_type,action_text,created_by_email,created_at)
  values(original.account_id,'NMI '||initcap(tx.action),initcap(tx.action)||' of $'||to_char(tx.amount,'FM999999990.00')||' approved.',tx.created_by_email,now());

  insert into public.audit_logs(action_type,action_text,target_type,target_id,created_by_email)
  values('NMI '||initcap(tx.action)||' Approved','Gateway transaction '||coalesce(p_gateway_transaction_id,'')||' reversed $'||to_char(tx.amount,'FM999999990.00')||'.','payments_ledger',reversal.id::text,tx.created_by_email);

  return jsonb_build_object(
    'ledger_id',reversal.id,'receipt_number',receipt,'balance_before',bal_before,'balance_after',bal_after,
    'amount',tx.amount,'action',tx.action,'gateway_transaction_id',p_gateway_transaction_id
  );
end;
$$;

revoke all on function public.cpcm_nmi_finalize_sale(uuid,text,text,jsonb,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.cpcm_nmi_apply_adjustment(uuid,text,text,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.cpcm_nmi_finalize_sale(uuid,text,text,jsonb,text,text,text,text,text) to service_role;
grant execute on function public.cpcm_nmi_apply_adjustment(uuid,text,text,jsonb,text,text,text) to service_role;

-- Realtime publication is optional; ignore duplicate-publication errors.
do $$
begin
  begin alter publication supabase_realtime add table public.nmi_transactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.nmi_webhook_events; exception when duplicate_object then null; end;
end $$;


comment on table public.payment_approval_requests is
  'NMI temporary card approval queue. Full card data and CVV never enter Supabase; only an NMI vault reference and masked card data are stored.';
comment on column public.payment_approval_requests.nmi_customer_vault_id is
  'Server-only temporary NMI Customer Vault reference. Never returned to the browser.';

commit;

select 'LIVE NMI Phase 1 R8N12 database migration completed.' as result;
