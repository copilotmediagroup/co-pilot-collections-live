-- Co Pilot Collections DEMO-compatible multi-tenant continuation.
-- Target only: Co Pilot Collections Demo (nixqpmgkmrzjsaqhqqew).
-- Checkpoint: Phase 1, Phase 3, and Phase 4 are already committed. Phase 5 failed and was rolled back.
-- Intentionally skips modules absent from the smaller DEMO schema: AI, RingCentral, NMI, voice broadcast, commissions, recruiting.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NULL OR to_regclass('public.organization_members') IS NULL THEN
    RAISE EXCEPTION 'DEMO CONTINUATION BLOCKED: Phase 1 foundation missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id='00000000-0000-4000-8000-000000000001'::uuid) THEN
    RAISE EXCEPTION 'DEMO CONTINUATION BLOCKED: legacy organization missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='organization_members' AND indexname='organization_members_one_active_org_per_user') THEN
    RAISE EXCEPTION 'DEMO CONTINUATION BLOCKED: Phase 1 membership uniqueness gate missing';
  END IF;
END $$;

-- SOURCE: MULTI_TENANT_PHASE9_RPC_GUARDRAILS.sql
-- Co Pilot Collections — Phase 9: RPC tenant guardrails
-- NON-PRODUCTION FIRST. RLS remains the primary boundary; these guards make tenant intent explicit.

create or replace function private.assert_account_in_current_organization(p_account_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_org uuid; v_current uuid;
begin
 if private.is_platform_admin() then
  select organization_id into v_org from public.accounts where id=p_account_id;
  if v_org is null then raise exception 'Account not found'; end if;
  return v_org;
 end if;
 v_current:=private.current_organization_id();
 if v_current is null then raise exception 'Active organization membership required' using errcode='42501'; end if;
 select organization_id into v_org from public.accounts where id=p_account_id and organization_id=v_current;
 if v_org is null then raise exception 'Account not found in current organization' using errcode='42501'; end if;
 return v_org;
end $$;
revoke all on function private.assert_account_in_current_organization(uuid) from public;
grant execute on function private.assert_account_in_current_organization(uuid) to authenticated;

-- Tenant-safe phone lookup. SECURITY INVOKER means existing account RLS still applies.
create or replace function public.cpcm_accounts_by_phone(p_phone text)
returns table(id uuid,full_name text,account_number text,current_balance numeric,original_creditor text,portfolio text,status text)
language sql stable security invoker set search_path=public as $$
 select a.id,a.full_name,a.account_number,a.current_balance,a.original_creditor,a.portfolio,a.status
 from public.accounts a
 where (private.is_platform_admin() or a.organization_id=private.current_organization_id())
 and length(regexp_replace(coalesce(p_phone,''),'\D','','g'))>=10
 and right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10) in (
  right(regexp_replace(coalesce(a.phone1,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone2,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone3,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone4,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone5,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone6,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone7,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone8,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone9,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone10,''),'\D','','g'),10))
 limit 20;
$$;
revoke all on function public.cpcm_accounts_by_phone(text) from public,anon;
grant execute on function public.cpcm_accounts_by_phone(text) to authenticated;


-- REQUIRED RPC AUDIT RULE:
-- Every authenticated RPC that accepts an account id must either be SECURITY INVOKER over tenant-fenced tables
-- or call private.assert_account_in_current_organization(target_account_id) before mutation.
-- Every SECURITY DEFINER RPC must derive tenant from auth.uid()/organization_members or a trusted stored record;
-- never accept organization_id from the browser as authority.

-- SOURCE: MULTI_TENANT_PHASE10_CLIENT_PORTAL_RPCS.sql
-- Phase 10 tenant-safe client portal RPC overrides. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'role',u.role,'approval_status',u.approval_status,
      'is_approved',u.is_approved,'is_active',u.is_active,'client_contact_name',u.client_contact_name,
      'client_company_name',u.client_company_name,'client_portal_enabled',u.client_portal_enabled,'client_can_view_accounts',u.client_can_view_accounts,'client_can_view_payments',u.client_can_view_payments,'client_can_download_reports',u.client_can_download_reports
    ) order by lower(u.email)) from public.app_users u where u.organization_id=oid and lower(u.email)<>actor),'[]'::jsonb),
    'portfolios',coalesce((select jsonb_agg(x.portfolio order by lower(x.portfolio)) from (select distinct trim(a.portfolio) portfolio from public.accounts a where a.organization_id=oid and nullif(trim(a.portfolio),'') is not null) x),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('client_email',lower(c.client_email),'portfolio_name',c.portfolio_name,'assigned_by_email',c.assigned_by_email,'updated_at',c.updated_at) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c where c.organization_id=oid),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_client_portal_access(target_email text, contact_name text, company_name text, approved boolean, portfolio_names text[], can_view_accounts boolean, can_view_payments boolean, can_download_reports boolean)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,''))); p text;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  update public.app_users set role='client',full_name=coalesce(nullif(trim(contact_name),''),full_name),client_contact_name=nullif(trim(contact_name),''),client_company_name=nullif(trim(company_name),''),client_portal_enabled=approved,client_can_view_accounts=coalesce(can_view_accounts,true),client_can_view_payments=coalesce(can_view_payments,true),client_can_download_reports=coalesce(can_download_reports,true),approval_status=case when approved then 'approved' else 'pending' end,is_approved=approved,is_active=approved,updated_at=now() where organization_id=oid and lower(email)=target;
  if not found then
    insert into public.app_users(organization_id,email,role,full_name,client_contact_name,client_company_name,client_portal_enabled,client_can_view_accounts,client_can_view_payments,client_can_download_reports,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values(oid,target,'client',nullif(trim(contact_name),''),nullif(trim(contact_name),''),nullif(trim(company_name),''),approved,coalesce(can_view_accounts,true),coalesce(can_view_payments,true),coalesce(can_download_reports,true),case when approved then 'approved' else 'pending' end,approved,approved,now(),now(),now());
  end if;
  delete from public.client_portfolio_assignments where organization_id=oid and lower(client_email)=target;
  foreach p in array coalesce(portfolio_names,array[]::text[]) loop
    if nullif(trim(p),'') is not null then insert into public.client_portfolio_assignments(organization_id,client_email,portfolio_name,assigned_by_email,updated_at) values(oid,target,trim(p),actor,now()) on conflict(organization_id,client_email,portfolio_name) do update set assigned_by_email=excluded.assigned_by_email,updated_at=now(); end if;
  end loop;
  return jsonb_build_object('ok',true,'email',target,'approved',approved,'portfolio_count',coalesce(array_length(portfolio_names,1),0));
end $$;

create or replace function public.cpcm_admin_disable_client_portal_access(target_email text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,'')));
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  update public.app_users set client_portal_enabled=false,approval_status='pending',is_approved=false,is_active=false,updated_at=now() where organization_id=oid and lower(email)=target and lower(role)='client';
  return jsonb_build_object('ok',true,'email',target);
end $$;

create or replace function public.cpcm_client_portal_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); profile_row public.app_users%rowtype; result jsonb;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where organization_id=oid and lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false) or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then raise exception 'client portal access is not approved'; end if;

  with allowed as (
    select distinct lower(trim(portfolio_name)) portfolio_key,trim(portfolio_name) portfolio_name from public.client_portfolio_assignments where organization_id=oid and lower(client_email)=actor
  ), acc as (
    select a.* from public.accounts a join allowed x on lower(trim(coalesce(a.portfolio,'')))=x.portfolio_key where a.organization_id=oid
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

-- SOURCE: MULTI_TENANT_PHASE11_STAFF_ADMIN_RPC.sql
-- Phase 11: tenant-safe staff administration override. NON-PRODUCTION FIRST.
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
  oid uuid:=private.current_organization_id();
  target text:=lower(trim(coalesce(target_email,'')));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  target_role text;
  released_count integer:=0;
  result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  if target=actor then raise exception 'protected admin account cannot be changed'; end if;

  select lower(coalesce(role,'employee')) into target_role
  from public.app_users where organization_id=oid and lower(email)=target limit 1;
  if not found then raise exception 'user not found'; end if;

  if action_name='approved' then
    update public.app_users set
      approval_status='approved',is_approved=true,is_active=true,
      client_portal_enabled=case when target_role='client' then true else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='pending' then
    update public.app_users set
      approval_status='pending',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='rejected' then
    update public.app_users set
      approval_status='rejected',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='activate' then
    update public.app_users set
      is_active=true,
      client_portal_enabled=case when target_role='client' and coalesce(is_approved,false) then true else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='deactivate' then
    update public.app_users set
      is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='remove' then
    update public.app_users set
      approval_status='removed',is_approved=false,is_active=false,client_portal_enabled=false,
      removed_at=now(),removed_by_email=actor,removal_reason=coalesce(nullif(trim(removal_reason_text),''),'Fired / removed'),updated_at=now()
    where organization_id=oid and lower(email)=target;

    update public.accounts set
      assigned_to_email=null,assigned_by_email=actor,assigned_at=null,
      assignment_method='employee_removed',assignment_group_id=null,updated_at=now()
    where organization_id=oid and lower(coalesce(assigned_to_email,''))=target;
    get diagnostics released_count=row_count;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select jsonb_build_object(
    'ok',true,'email',email,'role',role,'approval_status',approval_status,
    'is_approved',is_approved,'is_active',is_active,
    'client_portal_enabled',client_portal_enabled,
    'assigned_accounts_released',released_count
  ) into result from public.app_users where organization_id=oid and lower(email)=target limit 1;
  return result;
end;
$$;

revoke all on function public.cpcm_admin_manage_staff_user(text,text,text) from public;
grant execute on function public.cpcm_admin_manage_staff_user(text,text,text) to authenticated;
notify pgrst,'reload schema';

-- SOURCE: MULTI_TENANT_PHASE12_REMITTANCE_RPCS.sql
-- Phase 12: tenant-safe remittance/fee RPC overrides. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); oid uuid:=private.current_organization_id(); result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select jsonb_build_object(
    'clients',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'contact_name',u.client_contact_name,
      'company_name',u.client_company_name,'enabled',u.client_portal_enabled,
      'approved',u.is_approved,'active',u.is_active
    ) order by lower(coalesce(u.client_company_name,u.full_name,u.email)))
      from public.app_users u where u.organization_id=oid and lower(coalesce(u.role,''))='client'),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'client_email',lower(c.client_email),'portfolio_name',c.portfolio_name
    ) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c where c.organization_id=oid),'[]'::jsonb),
    'fee_schedules',coalesce((select jsonb_agg(to_jsonb(f) order by lower(f.client_email),lower(f.portfolio_name)) from public.client_fee_schedules f where f.organization_id=oid),'[]'::jsonb),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (
      select * from public.client_remittance_batches where organization_id=oid order by created_at desc limit 500
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
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if coalesce(new_agency_fee_percent,0)<0 or coalesce(new_agency_fee_percent,0)>100 then raise exception 'agency fee must be between 0 and 100'; end if;
  if coalesce(new_processor_fee_percent,0)<0 or coalesce(new_processor_fee_percent,0)>100 then raise exception 'processor fee percent must be between 0 and 100'; end if;
  if payer not in ('client','agency') then raise exception 'processor fee payer must be client or agency'; end if;

  insert into public.client_fee_schedules(
    organization_id,client_email,portfolio_name,agency_fee_percent,processor_fee_percent,processor_fee_fixed,
    processor_fee_payer,remittance_frequency,payment_terms_days,is_active,created_by_email,updated_at
  ) values(
    oid,target,portfolio,round(coalesce(new_agency_fee_percent,0),4),round(coalesce(new_processor_fee_percent,0),4),
    round(coalesce(new_processor_fee_fixed,0),2),payer,coalesce(nullif(trim(new_remittance_frequency),''),'Monthly'),
    greatest(0,least(365,coalesce(new_payment_terms_days,10))),true,actor,now()
  )
  on conflict(organization_id,client_email,portfolio_name) do update set
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
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if period_start_date is null or period_end_date is null or period_end_date<period_start_date then raise exception 'valid period dates are required'; end if;
  if not exists(select 1 from public.client_portfolio_assignments c where c.organization_id=oid and lower(c.client_email)=target and lower(trim(c.portfolio_name))=lower(portfolio)) then
    raise exception 'portfolio is not assigned to this client';
  end if;

  select f.agency_fee_percent,f.processor_fee_percent,f.processor_fee_fixed,lower(f.processor_fee_payer),f.remittance_frequency,f.payment_terms_days
  into fee_pct,proc_pct,proc_fixed,proc_payer,frequency_name,terms_days
  from public.client_fee_schedules f
  where f.organization_id=oid and lower(f.client_email)=target and lower(trim(f.portfolio_name))=lower(portfolio) and f.is_active=true
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
    join public.accounts a on a.id=l.account_id and a.organization_id=oid
    where l.organization_id=oid and lower(trim(coalesce(a.portfolio,'')))=lower(portfolio)
      and l.payment_date between period_start_date and period_end_date
      and lower(coalesce(l.status,''))='completed'
      and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit','reversal','adjustment debit')
      and not exists(
        select 1 from public.client_remittance_items ri
        where ri.organization_id=oid and ri.payment_ledger_id=l.id::text and ri.released=false
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
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  preview:=public.cpcm_admin_preview_remittance(target_client_email,target_portfolio_name,period_start_date,period_end_date,manual_adjustment);
  if coalesce((preview->>'payment_count')::integer,0)=0 then raise exception 'no unbatched completed payments were found for this period'; end if;

  select coalesce(nullif(trim(client_company_name),''),nullif(trim(full_name),''),lower(email)) into company_name
  from public.app_users where organization_id=oid and lower(email)=lower(trim(target_client_email)) limit 1;
  number_value:='REM-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.client_remittance_batches(
    organization_id,batch_number,client_email,client_company_name,portfolio_name,period_start,period_end,payment_count,
    gross_collections,reversals,net_collections,agency_fee_percent,agency_fee_amount,processor_fees,
    processor_fee_payer,adjustments,net_remittance,status,due_date,notes,created_by_email,updated_at
  ) values(
    oid,number_value,lower(trim(target_client_email)),company_name,trim(target_portfolio_name),period_start_date,period_end_date,
    (preview->>'payment_count')::integer,(preview->>'gross_collections')::numeric,(preview->>'reversals')::numeric,
    (preview->>'net_collections')::numeric,(preview->>'agency_fee_percent')::numeric,(preview->>'agency_fee_amount')::numeric,
    (preview->>'processor_fees')::numeric,preview->>'processor_fee_payer',(preview->>'adjustments')::numeric,
    (preview->>'net_remittance')::numeric,'Draft',coalesce(remittance_due_date,(preview->>'suggested_due_date')::date),
    nullif(trim(batch_notes),''),actor,now()
  ) returning * into new_batch;

  for item_record in select value item from jsonb_array_elements(preview->'items') loop
    insert into public.client_remittance_items(
      organization_id,batch_id,payment_ledger_id,account_id,consumer_name,account_number,payment_date,payment_type,payment_method,
      gross_amount,signed_amount,processor_fee,released
    ) values(
      oid,new_batch.id,item_record.item->>'payment_ledger_id',item_record.item->>'account_id',item_record.item->>'consumer_name',
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
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  select * into current_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id for update;
  if not found then raise exception 'remittance batch not found'; end if;

  if action_name='approve' then
    if lower(current_batch.status)<>'draft' then raise exception 'only a draft batch can be approved'; end if;
    update public.client_remittance_batches set status='Approved',approved_at=now(),approved_by_email=actor,
      notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now() where organization_id=oid and id=target_batch_id;
  elsif action_name='paid' then
    if lower(current_batch.status)<>'approved' then raise exception 'approve the batch before marking it paid'; end if;
    update public.client_remittance_batches set status='Paid',paid_at=now(),paid_by_email=actor,
      payment_reference=nullif(trim(new_payment_reference),''),notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where organization_id=oid and id=target_batch_id;
  elsif action_name='draft' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot return to draft'; end if;
    update public.client_remittance_batches set status='Draft',approved_at=null,approved_by_email=null,updated_at=now()
      where organization_id=oid and id=target_batch_id;
  elsif action_name='void' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot be voided'; end if;
    update public.client_remittance_batches set status='Void',notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where organization_id=oid and id=target_batch_id;
    update public.client_remittance_items set released=true where organization_id=oid and batch_id=target_batch_id;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select * into current_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id;
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
  oid uuid:=private.current_organization_id(); is_admin boolean:=private.is_organization_admin(oid);
begin
  select * into selected_batch from public.client_remittance_batches where organization_id=oid and id=target_batch_id limit 1;
  if not found then raise exception 'remittance batch not found'; end if;
  if not is_admin and not (lower(selected_batch.client_email)=actor and lower(selected_batch.status) in ('approved','paid')) then
    raise exception 'not authorized for this remittance statement';
  end if;
  return jsonb_build_object(
    'batch',to_jsonb(selected_batch),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.payment_date,i.consumer_name) from public.client_remittance_items i where i.organization_id=oid and i.batch_id=target_batch_id),'[]'::jsonb)
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
  select * into profile_row from public.app_users where organization_id=oid and lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false)
     or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then
    raise exception 'client portal access is not approved';
  end if;

  return jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'company_name',profile_row.client_company_name,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object(
      'pending_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status)='approved'),0),
      'paid_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status)='paid'),0),
      'agency_fees',coalesce((select sum(agency_fee_amount) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'processor_fees',coalesce((select sum(processor_fees) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'statement_count',coalesce((select count(*) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'last_remittance_date',(select max(coalesce(paid_at,approved_at,created_at)) from public.client_remittance_batches where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid'))
    ),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.period_end desc,b.created_at desc) from (
      select * from public.client_remittance_batches
      where organization_id=oid and lower(client_email)=actor and lower(status) in ('approved','paid')
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

-- SOURCE: MULTI_TENANT_PHASE2_TENANT_FENCE_DRAFT.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 2 DRAFT
-- DO NOT APPLY TO LIVE YET.
-- Prerequisite: MULTI_TENANT_PHASE1_FOUNDATION.sql has passed on a non-production database.
-- This layer is designed to preserve existing role/assignment/client policies while adding a restrictive tenant fence.


-- Stamp writes from authenticated tenant users at the database boundary.
-- Ordinary users cannot choose another tenant by manipulating browser requests.
create or replace function private.stamp_current_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_org uuid;
begin
  if private.is_platform_admin() then
    -- Platform admin may explicitly target a tenant. If omitted, retain the compatibility default.
    return new;
  end if;

  current_org := private.current_organization_id();
  if current_org is null then
    raise exception 'No active organization membership for authenticated user' using errcode='42501';
  end if;

  new.organization_id := current_org;
  return new;
end $$;

revoke all on function private.stamp_current_organization() from public;
grant execute on function private.stamp_current_organization() to authenticated;

-- Known agency-scoped tables. Phase 1 guarantees organization_id exists on every table that exists.
do $$
declare
  t text;
  tenant_tables text[] := array[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments',
    'payment_promises','payments_ledger','account_docs','call_results','follow_ups','disputes','settlements',
    'audit_logs','role_permissions','import_batches','company_settings','collector_alerts','compliance_events',
    'client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
    'nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events',
    'team_messages','team_typing_status','team_presence','ringcentral_call_records','employee_commission_earnings',
    'voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
    'voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa','ai_collector_script_profiles','account_communication_compliance',
    'ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);

      -- Separate policies per operation, deliberately RESTRICTIVE so they AND with the app's existing role policies.
      execute format('drop policy if exists cpcm_tenant_select on public.%I',t);
      execute format(
        'create policy cpcm_tenant_select on public.%I as restrictive for select to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_insert on public.%I',t);
      execute format(
        'create policy cpcm_tenant_insert on public.%I as restrictive for insert to authenticated with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_update on public.%I',t);
      execute format(
        'create policy cpcm_tenant_update on public.%I as restrictive for update to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id()) with check (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop policy if exists cpcm_tenant_delete on public.%I',t);
      execute format(
        'create policy cpcm_tenant_delete on public.%I as restrictive for delete to authenticated using (private.is_platform_admin() or organization_id = private.current_organization_id())',t
      );

      execute format('drop trigger if exists cpcm_stamp_organization on public.%I',t);
      execute format(
        'create trigger cpcm_stamp_organization before insert on public.%I for each row execute function private.stamp_current_organization()',t
      );
    end if;
  end loop;
end $$;

-- IMPORTANT: Keep the legacy DEFAULT during the first test pass so current production-shaped code can still be exercised.
-- After Agency A/B deny-tests and all server-side functions are tenant-aware, Phase 3 removes that default.


-- REQUIRED TEST GATE BEFORE LIVE:
-- 1. Create Agency A and Agency B test auth users and memberships.
-- 2. Insert at least one account under each agency.
-- 3. As Agency A: SELECT/UPDATE/DELETE Agency B account must return no row / be denied.
-- 4. As Agency A: INSERT with Agency B organization_id must be overwritten to Agency A or denied.
-- 5. Repeat A<->B for payments_ledger, payment_plans, team_messages and account_docs.
-- 6. Confirm collector assignment restrictions still work inside the same agency.
-- 7. Confirm Client portfolio restrictions still work inside the same agency.
-- 8. Confirm platform admin can inspect both tenants.
-- 9. Confirm anon/public recruiting flows have not been unintentionally changed.
-- 10. Only after all tests pass: remove temporary legacy organization defaults.

-- SOURCE: MULTI_TENANT_PHASE17_MESSENGER_STAFF_RPCS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 17
-- Tenant-safe Messenger staff naming and directory RPCs.

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
  oid uuid := private.current_organization_id();
  actor_is_admin boolean := private.is_organization_admin(oid);
begin
  if actor_email = '' or oid is null then raise exception 'not authenticated in an organization'; end if;
  if target = '' then raise exception 'target_email required'; end if;
  if not (actor_is_admin or actor_email = target) then raise exception 'not allowed'; end if;

  update public.app_users
     set full_name=clean, updated_at=now()
   where organization_id=oid and lower(email)=target;

  if not found then
    if actor_email <> target then raise exception 'staff user not found in current organization'; end if;
    insert into public.app_users
      (organization_id,email,role,full_name,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values
      (oid,target,'employee',clean,'pending',false,false,now(),now(),now());
  end if;
  return jsonb_build_object('ok',true,'email',target,'full_name',clean);
end;
$$;

revoke all on function public.cpcm_update_staff_display_name(text,text) from public,anon;
grant execute on function public.cpcm_update_staff_display_name(text,text) to authenticated;

create or replace function public.cpcm_staff_directory()
returns table(email text,role text,full_name text,approval_status text,is_approved boolean,is_active boolean,last_seen_at timestamptz,updated_at timestamptz,created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.email,u.role,u.full_name,u.approval_status,u.is_approved,u.is_active,u.last_seen_at,u.updated_at,u.created_at
  from public.app_users u
  where u.organization_id=private.current_organization_id()
    and lower(coalesce(u.role,'')) in ('admin','agency_admin','employee','collector')
    and coalesce(u.is_active,true) is not false
    and lower(coalesce(u.approval_status,'')) not in ('removed','rejected','fired')
  order by lower(u.email);
$$;

revoke all on function public.cpcm_staff_directory() from public,anon;
grant execute on function public.cpcm_staff_directory() to authenticated;
notify pgrst,'reload schema';

-- SOURCE: MULTI_TENANT_PHASE18_CALL_ACTIVITY_RPCS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 18
-- Tenant-bind call-attempt RPCs to the authenticated user's agency and trusted account ownership.

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
  oid uuid := private.assert_account_in_current_organization(p_account_id);
  v_now timestamptz := now();
  v_call_id uuid;
  v_email text := lower(coalesce(nullif(auth.jwt()->>'email',''), nullif(p_created_by_email,''), 'unknown'));
  v_count integer := 0;
  v_inserted boolean := false;
begin
  insert into public.call_results(
    organization_id, account_id, phone_number, call_result, disposition, notes,
    result_at, created_by_email, created_at,
    attempt_id, attempt_status, event_type, dialed_at,
    direction, outcome_category, call_source, updated_at
  ) values (
    oid, p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
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
     where organization_id=oid and id = p_account_id
     returning call_count into v_count;

    insert into public.activity_logs(
      organization_id, account_id, action_type, action_text, phone_number,
      created_by_email, created_at, event_key, metadata
    ) values (
      oid, p_account_id, 'Call Attempt',
      'Outbound call attempt launched to ' || regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
      v_email, v_now, 'call-attempt:' || p_attempt_id,
      jsonb_build_object('attempt_id',p_attempt_id,'source',coalesce(nullif(p_call_source,''),'Phone Link'))
    ) on conflict do nothing;
  else
    select id into v_call_id
      from public.call_results
     where organization_id=oid and attempt_id = p_attempt_id
     order by created_at desc
     limit 1;
    select coalesce(call_count,0) into v_count from public.accounts where organization_id=oid and id=p_account_id;
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
  oid uuid := private.assert_account_in_current_organization(p_account_id);
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
     where organization_id=oid and attempt_id = p_attempt_id
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
     where organization_id=oid and id = v_call_id;
  else
    v_new_call := true;
    insert into public.call_results(
      organization_id, account_id, phone_number, call_result, disposition, notes,
      result_at, created_by_email, created_at,
      attempt_id, attempt_status, event_type, dialed_at,
      direction, outcome_category, duration_seconds, answered_by,
      is_contact, is_rpc, is_promise, is_callback, is_wrong_number,
      next_call_at, account_balance_snapshot, call_source, updated_at
    ) values (
      oid, p_account_id, regexp_replace(coalesce(p_phone_number,''), '[^0-9]', '', 'g'),
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
     where organization_id=oid and id = p_account_id;

    insert into public.activity_logs(
      organization_id, account_id, action_type, action_text, phone_number,
      old_status, new_status, created_by_email, created_at,
      event_key, metadata
    ) values (
      oid, p_account_id, 'Call Result',
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


-- SOURCE: MULTI_TENANT_PHASE20_PAYMENT_PROMISE_RPCS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 20
-- Tenant-bind payment promise creation and paid transition. SECURITY INVOKER + RLS remain active.

-- Global receipt strings remain UUID-derived and globally safe. Promise group identifiers are tenant-scoped.
drop index if exists public.payment_promises_group_schedule_unique_idx;
create unique index if not exists payment_promises_org_group_schedule_unique_idx
on public.payment_promises(organization_id,promise_group_id,schedule_index)
where promise_group_id is not null and btrim(promise_group_id)<>'';

create or replace function public.cpcm_create_payment_promises(target_account_id uuid,promise_group text,promises jsonb,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.assert_account_in_current_organization(target_account_id); a public.accounts%rowtype; item jsonb; inserted_count integer:=0; expected_count integer; idx integer; amt numeric; due date;
begin
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update;
 if not found then raise exception 'Account not found'; end if;
 if promise_group is null or btrim(promise_group)='' then raise exception 'Promise group required'; end if;
 if promises is null or jsonb_typeof(promises)<>'array' or jsonb_array_length(promises)=0 then raise exception 'Promise schedule required'; end if;
 expected_count:=jsonb_array_length(promises);
 for item in select * from jsonb_array_elements(promises) loop
  idx:=coalesce((item->>'schedule_index')::integer,0); amt:=coalesce((item->>'payment_amount')::numeric,0); due:=(item->>'due_date')::date;
  if idx<1 or amt<=0 or due is null then raise exception 'Invalid promise schedule item'; end if;
  insert into public.payment_promises(organization_id,account_id,promise_group_id,schedule_index,schedule_total,debtor_name,account_number,payment_kind,payment_amount,total_amount,due_date,payment_method,method_last4,authorization_method,status,employee_email,assigned_to_email,notes,created_by_email,updated_at)
  values(oid,target_account_id,promise_group,idx,expected_count,item->>'debtor_name',item->>'account_number',item->>'payment_kind',amt,coalesce((item->>'total_amount')::numeric,amt*expected_count),due,item->>'payment_method',nullif(item->>'method_last4',''),item->>'authorization_method',coalesce(nullif(item->>'status',''),'Pending Processing'),coalesce(item->>'employee_email',actor_email),item->>'assigned_to_email',item->>'notes',coalesce(actor_email,item->>'created_by_email','system'),now())
  on conflict (organization_id,promise_group_id,schedule_index) where promise_group_id is not null and btrim(promise_group_id)<>'' do nothing;
  if found then inserted_count:=inserted_count+1; end if;
 end loop;
 if inserted_count not in (0,expected_count) then raise exception 'Partial promise group detected'; end if;
 if inserted_count=expected_count then update public.accounts set status='Promise to Pay',disposition='Promise to Pay',updated_at=now() where organization_id=oid and id=target_account_id; end if;
 return jsonb_build_object('ok',true,'created_count',inserted_count,'already_exists',inserted_count=0,'promise_group_id',promise_group);
end; $$;

create or replace function public.cpcm_mark_payment_promise_paid(target_promise_id uuid,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p public.payment_promises%rowtype; a public.accounts%rowtype; oid uuid:=private.current_organization_id(); amt numeric; before_bal numeric; after_bal numeric; receipt text; ledger_id uuid;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_promises where organization_id=oid and id=target_promise_id for update;
 if not found then raise exception 'Payment promise not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if lower(coalesce(p.status,''))='paid' then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number='PTP-'||target_promise_id::text limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 if p.account_id is null then raise exception 'Payment promise has no account'; end if;
 select * into a from public.accounts where organization_id=oid and id=p.account_id for update;
 if not found then raise exception 'Account not found'; end if;
 amt:=greatest(coalesce(p.payment_amount,0),0); if amt<=0 then raise exception 'Payment amount must be greater than zero'; end if;
 before_bal:=greatest(coalesce(a.current_balance,0),0); after_bal:=greatest(before_bal-amt,0); receipt:='PTP-'||target_promise_id::text;
 insert into public.payments_ledger(organization_id,account_id,amount,payment_amount,payment_date,paid_at,payment_method,status,notes,created_by_email,payment_type,receipt_number,balance_before,balance_after,idempotency_key)
 values(oid,p.account_id,amt,amt,current_date,now(),coalesce(p.payment_method,'Other'),'Completed','Admin marked payment promise paid. '||coalesce(p.notes,''),coalesce(actor_email,p.processed_by_email,p.employee_email,'system'),'Payment',receipt,before_bal,after_bal,receipt)
 on conflict (receipt_number) where receipt_number is not null and btrim(receipt_number)<>'' do nothing returning id into ledger_id;
 if ledger_id is null then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number=receipt limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 update public.accounts set current_balance=after_bal,status=case when after_bal<=0 then 'Settled' else status end,disposition=case when after_bal<=0 then 'Settled' else disposition end,updated_at=now() where organization_id=oid and id=p.account_id;
 update public.payment_promises set status='Paid',paid_amount=amt,paid_date=current_date,processed_by_email=coalesce(actor_email,processed_by_email),processed_at=now(),updated_at=now() where organization_id=oid and id=target_promise_id;
 return jsonb_build_object('ok',true,'already_paid',false,'ledger_id',ledger_id,'account_id',p.account_id,'amount',amt,'balance_before',before_bal,'balance_after',after_bal);
end; $$;

-- Broken-promise uniqueness must also be tenant-aware because source identifiers may repeat across agencies.
drop index if exists public.collector_alerts_source_open_unique_idx;
create unique index if not exists collector_alerts_org_source_open_unique_idx on public.collector_alerts(organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'';
drop index if exists public.follow_ups_broken_source_unique_idx;
create unique index if not exists follow_ups_org_broken_source_unique_idx on public.follow_ups(organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up';

create or replace function public.cpcm_flag_broken_plan_payment(target_payment_id uuid,actor_email text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); p public.payment_plan_payments%rowtype; aid uuid; pid uuid; assignee text;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_plan_payments where organization_id=oid and id=target_payment_id for update; if not found then raise exception 'Scheduled payment not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if coalesce(p.due_date,p.scheduled_date,p.payment_date)>=current_date or lower(coalesce(p.status,'')) in ('paid','cancelled') or coalesce(p.amount_paid,0)>=coalesce(p.amount_due,p.payment_amount,p.amount,0) then return jsonb_build_object('ok',true,'flagged',false); end if;
 aid:=p.account_id; pid:=coalesce(p.plan_id,p.payment_plan_id);
 update public.payment_plan_payments set status='Broken Promise',updated_at=now() where organization_id=oid and id=p.id;
 if pid is not null then update public.payment_plans set status='Broken Promise',updated_at=now() where organization_id=oid and id=pid; end if;
 update public.accounts set status='Broken Promise',disposition='Broken Promise',updated_at=now() where organization_id=oid and id=aid returning assigned_to_email into assignee;
 insert into public.follow_ups(organization_id,account_id,follow_up_type,due_date,status,assigned_to_email,reason,notes,created_by_email) values(oid,aid,'Broken Promise Follow-Up',current_date,'Open',coalesce(assignee,actor_email,''),'Missed payment promise','Automatically created from broken promise automation.',coalesce(actor_email,'system')) on conflict (organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up' do nothing;
 insert into public.collector_alerts(organization_id,account_id,alert_type,severity,title,message,due_date,status,assigned_to_email,created_by_email,source_table,source_id) values(oid,aid,'Broken Promise','critical','Broken payment plan promise','Missed scheduled payment requires follow-up.',current_date,'Open',coalesce(assignee,actor_email,''),coalesce(actor_email,'system'),'payment_plan_payments',p.id::text) on conflict (organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'' do nothing;
 return jsonb_build_object('ok',true,'flagged',true,'account_id',aid);
end; $$;

create or replace function public.cpcm_flag_broken_manual_promise(target_promise_id uuid,actor_email text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); p public.payment_promises%rowtype; assignee text; amt numeric;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_promises where organization_id=oid and id=target_promise_id for update; if not found then raise exception 'Payment promise not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if p.due_date>=current_date or lower(coalesce(p.status,'')) in ('paid','completed','settled','canceled','cancelled','broken promise') or coalesce(p.paid_amount,0)>=coalesce(p.payment_amount,0) then return jsonb_build_object('ok',true,'flagged',false); end if;
 amt:=greatest(coalesce(p.payment_amount,0)-coalesce(p.paid_amount,0),0);
 update public.payment_promises set status='Broken Promise',admin_note='Auto-flagged missed payment promise due '||p.due_date::text||'.',processed_by_email=coalesce(actor_email,processed_by_email),processed_at=now(),updated_at=now() where organization_id=oid and id=p.id;
 update public.accounts set status='Broken Promise',disposition='Broken Promise',updated_at=now() where organization_id=oid and id=p.account_id returning assigned_to_email into assignee;
 insert into public.follow_ups(organization_id,account_id,follow_up_type,due_date,status,assigned_to_email,reason,notes,created_by_email) values(oid,p.account_id,'Broken Promise Follow-Up',current_date,'Open',coalesce(assignee,p.employee_email,actor_email,''),'Missed manual payment promise','Automatically created from Promise Automation.',coalesce(actor_email,'system')) on conflict (organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up' do nothing;
 insert into public.collector_alerts(organization_id,account_id,alert_type,severity,title,message,due_date,status,assigned_to_email,created_by_email,source_table,source_id) values(oid,p.account_id,'Broken Promise','critical','Broken promise needs follow-up','Missed manual payment promise of '||amt::text||' requires follow-up.',current_date,'Open',coalesce(assignee,p.employee_email,actor_email,''),coalesce(actor_email,'system'),'payment_promises',p.id::text) on conflict (organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'' do nothing;
 return jsonb_build_object('ok',true,'flagged',true,'account_id',p.account_id,'amount',amt);
end; $$;

-- SOURCE: MULTI_TENANT_PHASE21_PAYMENT_PLAN_LEDGER_RPCS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 21
-- Tenant-bind payment-plan creation, scheduled payment transitions, and manual ledger posting.

create or replace function public.cpcm_mark_scheduled_plan_payment_paid(target_payment_id uuid,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); p public.payment_plan_payments%rowtype; a public.accounts%rowtype; pl public.payment_plans%rowtype; amt numeric; before_bal numeric; after_bal numeric; receipt text; ledger_id uuid; pid uuid;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_plan_payments where organization_id=oid and id=target_payment_id for update; if not found then raise exception 'Scheduled payment not found'; end if; perform private.assert_account_in_current_organization(p.account_id);
 if lower(coalesce(p.status,''))='paid' or coalesce(p.amount_paid,0)>=coalesce(p.amount_due,p.payment_amount,p.amount,0) then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number='PLANPAY-'||target_payment_id::text limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 if p.account_id is null then raise exception 'Scheduled payment has no account'; end if; select * into a from public.accounts where organization_id=oid and id=p.account_id for update; if not found then raise exception 'Account not found'; end if;
 pid:=coalesce(p.plan_id,p.payment_plan_id); if pid is not null then select * into pl from public.payment_plans where organization_id=oid and id=pid for update; end if;
 amt:=greatest(coalesce(p.amount_due,p.payment_amount,p.amount,0),0); if amt<=0 then raise exception 'Payment amount must be greater than zero'; end if; before_bal:=greatest(coalesce(a.current_balance,0),0); after_bal:=greatest(before_bal-amt,0); receipt:='PLANPAY-'||target_payment_id::text;
 insert into public.payments_ledger(organization_id,account_id,payment_plan_id,amount,payment_amount,payment_date,paid_at,payment_method,status,notes,created_by_email,payment_type,receipt_number,balance_before,balance_after,plan_payment_id,idempotency_key) values(oid,p.account_id,pid,amt,amt,current_date,now(),coalesce(p.payment_method,'Other'),'Completed','Marked paid from Promise Dashboard',coalesce(actor_email,p.created_by_email,'system'),'Payment',receipt,before_bal,after_bal,target_payment_id,receipt) on conflict (receipt_number) where receipt_number is not null and btrim(receipt_number)<>'' do nothing returning id into ledger_id;
 if ledger_id is null then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number=receipt limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 update public.accounts set current_balance=after_bal,status=case when after_bal<=0 then 'Settled' else status end,disposition=case when after_bal<=0 then 'Settled' else disposition end,updated_at=now() where organization_id=oid and id=p.account_id;
 update public.payment_plan_payments set amount_paid=amt,paid_date=current_date,payment_date=current_date,paid_at=now(),status='Paid',updated_at=now() where organization_id=oid and id=target_payment_id;
 if pid is not null then update public.payment_plans set remaining_amount=greatest(coalesce(remaining_amount,total_amount,balance,0)-amt,0),status=case when greatest(coalesce(remaining_amount,total_amount,balance,0)-amt,0)<=0 then 'Paid' else status end,updated_at=now() where organization_id=oid and id=pid; end if;
 return jsonb_build_object('ok',true,'already_paid',false,'ledger_id',ledger_id,'account_id',p.account_id,'amount',amt,'balance_before',before_bal,'balance_after',after_bal);
end; $$;

create or replace function public.cpcm_post_manual_ledger_payment(target_account_id uuid,payment_amount numeric,payment_type_text text,payment_method_text text,payment_status_text text,payment_date_value date,receipt_text text,processor_fee_value numeric default 0,notes_text text default null,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.assert_account_in_current_organization(target_account_id); a public.accounts%rowtype; amt numeric; before_bal numeric; after_bal numeric; ledger_id uuid; effect numeric:=0;
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if receipt_text is null or btrim(receipt_text)='' then raise exception 'Receipt number required'; end if;
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update; if not found then raise exception 'Account not found'; end if;
 select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number=receipt_text limit 1; if ledger_id is not null then return jsonb_build_object('ok',true,'already_posted',true,'ledger_id',ledger_id,'account_id',target_account_id); end if;
 amt:=greatest(coalesce(payment_amount,0),0); if amt<=0 then raise exception 'Payment amount must be greater than zero'; end if; before_bal:=greatest(coalesce(a.current_balance,0),0);
 if lower(coalesce(payment_status_text,''))='completed' then if lower(coalesce(payment_type_text,'')) in ('payment','adjustment credit') then effect:=-amt; elsif lower(coalesce(payment_type_text,'')) in ('reversal','adjustment debit') then effect:=amt; end if; end if;
 if effect<0 and amt>before_bal+0.01 then raise exception 'Payment exceeds current balance'; end if; after_bal:=greatest(before_bal+effect,0);
 insert into public.payments_ledger(organization_id,account_id,payment_date,amount,payment_amount,payment_type,payment_method,processor_fee,status,receipt_number,balance_before,balance_after,notes,created_by_email,idempotency_key) values(oid,target_account_id,coalesce(payment_date_value,current_date),amt,amt,coalesce(payment_type_text,'Payment'),coalesce(payment_method_text,'Other'),coalesce(processor_fee_value,0),coalesce(payment_status_text,'Completed'),receipt_text,before_bal,after_bal,notes_text,coalesce(actor_email,'system'),receipt_text) on conflict (receipt_number) where receipt_number is not null and btrim(receipt_number)<>'' do nothing returning id into ledger_id;
 if ledger_id is null then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number=receipt_text limit 1; return jsonb_build_object('ok',true,'already_posted',true,'ledger_id',ledger_id,'account_id',target_account_id); end if;
 if lower(coalesce(payment_status_text,''))='completed' and effect<>0 then update public.accounts set current_balance=after_bal,status=case when after_bal<=0 then 'Settled' else status end,disposition=case when after_bal<=0 then 'Settled' else disposition end,updated_at=now() where organization_id=oid and id=target_account_id; end if;
 return jsonb_build_object('ok',true,'already_posted',false,'ledger_id',ledger_id,'account_id',target_account_id,'amount',amt,'balance_before',before_bal,'balance_after',after_bal);
end; $$;

create or replace function public.cpcm_create_payment_plan(target_account_id uuid,plan_total numeric,plan_frequency text,plan_status text,plan_notes text,plan_start_date date,plan_next_due_date date,regular_payment_amount numeric,schedule jsonb,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.assert_account_in_current_organization(target_account_id); a public.accounts%rowtype; old_id uuid; pid uuid; item jsonb; due numeric; paid numeric; sched_total numeric:=0; paid_total numeric:=0; remaining numeric; d date; st text;
begin
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update; if not found then raise exception 'Account not found'; end if; if coalesce(plan_total,0)<=0 then raise exception 'Plan total must be greater than zero'; end if; if plan_total>coalesce(a.current_balance,0)+0.01 then raise exception 'Plan total exceeds current account balance'; end if; if schedule is null or jsonb_typeof(schedule)<>'array' or jsonb_array_length(schedule)=0 then raise exception 'Payment schedule required'; end if;
 for item in select * from jsonb_array_elements(schedule) loop due:=greatest(coalesce((item->>'amount_due')::numeric,0),0); paid:=greatest(coalesce((item->>'amount_paid')::numeric,0),0); if paid>due+0.01 then raise exception 'Scheduled payment paid amount exceeds due amount'; end if; sched_total:=sched_total+due; paid_total:=paid_total+paid; end loop; if sched_total>plan_total+0.01 then raise exception 'Scheduled payments exceed plan total'; end if; remaining:=greatest(plan_total-paid_total,0);
 select id into old_id from public.payment_plans where organization_id=oid and account_id=target_account_id and lower(coalesce(status,'')) not in ('paid','cancelled','replaced') order by created_at desc limit 1 for update; if old_id is not null then update public.payment_plans set status='Replaced',updated_at=now() where organization_id=oid and id=old_id; end if;
 insert into public.payment_plans(organization_id,account_id,total_amount,starting_balance,remaining_amount,balance,payment_amount,frequency,start_date,next_due_date,status,notes,created_by_email,updated_at) values(oid,target_account_id,plan_total,coalesce(a.current_balance,0),remaining,remaining,coalesce(regular_payment_amount,0),coalesce(plan_frequency,'Custom'),plan_start_date,plan_next_due_date,coalesce(plan_status,'Active'),plan_notes,coalesce(actor_email,'system'),now()) returning id into pid;
 for item in select * from jsonb_array_elements(schedule) loop due:=greatest(coalesce((item->>'amount_due')::numeric,0),0); paid:=greatest(coalesce((item->>'amount_paid')::numeric,0),0); d:=coalesce((item->>'due_date')::date,current_date); st:=coalesce(nullif(item->>'status',''),case when paid+0.01>=due and due>0 then 'Paid' when paid>0 then 'Partial' else 'Scheduled' end); insert into public.payment_plan_payments(organization_id,plan_id,payment_plan_id,account_id,due_date,scheduled_date,amount_due,amount,payment_amount,amount_paid,paid_date,payment_date,paid_at,status,notes,created_by_email,updated_at) values(oid,pid,pid,target_account_id,d,d,due,due,due,paid,case when paid>0 then coalesce((item->>'paid_date')::date,d) end,case when paid>0 then coalesce((item->>'paid_date')::date,d) end,case when paid>0 then now() end,st,plan_notes,coalesce(actor_email,'system'),now()); end loop;
 update public.accounts set current_balance=remaining,status=case when lower(coalesce(plan_status,''))='active' then 'Promise to Pay' else status end,disposition='Promise to Pay',updated_at=now() where organization_id=oid and id=target_account_id;
 return jsonb_build_object('ok',true,'plan_id',pid,'replaced_plan_id',old_id,'remaining_amount',remaining);
end; $$;

create or replace function public.cpcm_apply_payment_to_plan(target_account_id uuid,payment_amount numeric)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.assert_account_in_current_organization(target_account_id); pl public.payment_plans%rowtype; p public.payment_plan_payments%rowtype; amt numeric; left_amt numeric; due_left numeric; applied_amt numeric; new_paid numeric; total_applied numeric:=0; new_remaining numeric; applied jsonb:='[]'::jsonb;
begin
 amt:=greatest(coalesce(payment_amount,0),0); if amt<=0 then return jsonb_build_object('ok',true,'applied',applied,'total_applied',0); end if;
 select * into pl from public.payment_plans where organization_id=oid and account_id=target_account_id and lower(coalesce(status,'')) not in ('paid','cancelled') order by created_at desc limit 1 for update;
 if not found then return jsonb_build_object('ok',true,'applied',applied,'total_applied',0); end if; left_amt:=amt;
 for p in select * from public.payment_plan_payments where organization_id=oid and account_id=target_account_id and coalesce(plan_id,payment_plan_id)=pl.id and lower(coalesce(status,'')) not in ('paid','cancelled') order by coalesce(due_date,scheduled_date,payment_date),created_at for update loop
  exit when left_amt<=0; due_left:=greatest(coalesce(p.amount_due,p.payment_amount,p.amount,0)-coalesce(p.amount_paid,0),0); if due_left<=0 then continue; end if; applied_amt:=least(due_left,left_amt); new_paid:=round((coalesce(p.amount_paid,0)+applied_amt)::numeric,2);
  update public.payment_plan_payments set amount_paid=new_paid,paid_date=case when new_paid+0.01>=coalesce(amount_due,payment_amount,amount,0) then current_date else paid_date end,status=case when new_paid+0.01>=coalesce(amount_due,payment_amount,amount,0) then 'Paid' else 'Partial' end,updated_at=now() where organization_id=oid and id=p.id;
  left_amt:=round((left_amt-applied_amt)::numeric,2); total_applied:=total_applied+applied_amt; applied:=applied||jsonb_build_array(jsonb_build_object('paymentId',p.id,'applied',applied_amt,'status',case when new_paid+0.01>=coalesce(p.amount_due,p.payment_amount,p.amount,0) then 'Paid' else 'Partial' end));
 end loop;
 if total_applied>0 then new_remaining:=greatest(coalesce(pl.remaining_amount,pl.total_amount,pl.balance,0)-total_applied,0); update public.payment_plans set remaining_amount=new_remaining,status=case when new_remaining<=0 then 'Paid' else 'Active' end,updated_at=now() where organization_id=oid and id=pl.id; end if;
 return jsonb_build_object('ok',true,'plan_id',pl.id,'applied',applied,'total_applied',total_applied);
end; $$;

-- SOURCE: MULTI_TENANT_PHASE22_DESTRUCTIVE_ACCOUNT_RPCS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 22
-- Tenant-bind destructive archive deletion and Clear Accounts operations.

create or replace function public.cpcm_delete_archived_account(target_account_id uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); a public.accounts%rowtype;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update;
 if not found then return jsonb_build_object('ok',true,'deleted',false,'already_missing',true); end if;
 if a.archived_at is null then raise exception 'Only archived accounts may be permanently deleted'; end if;
 delete from public.accounts where organization_id=oid and id=target_account_id and archived_at is not null;
 return jsonb_build_object('ok',true,'deleted',true,'account_id',target_account_id);
end; $$;

create or replace function public.cpcm_delete_archived_portfolio(target_portfolio text,expected_count integer default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); actual_count integer; deleted_count integer;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if target_portfolio is null or btrim(target_portfolio)='' then raise exception 'Portfolio required'; end if;
 perform 1 from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio for update;
 select count(*) into actual_count from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio;
 if actual_count=0 then return jsonb_build_object('ok',true,'deleted_count',0,'already_empty',true); end if;
 if expected_count is not null and actual_count<>expected_count then raise exception 'Archived portfolio changed during confirmation. Expected %, found %',expected_count,actual_count; end if;
 delete from public.accounts where organization_id=oid and archived_at is not null and portfolio=target_portfolio;
 get diagnostics deleted_count=row_count; if deleted_count<>actual_count then raise exception 'Delete verification failed'; end if;
 return jsonb_build_object('ok',true,'deleted_count',deleted_count,'portfolio',target_portfolio);
end; $$;

create or replace function public.admin_clear_accounts()
returns json language plpgsql security definer set search_path=public as $$
declare
 oid uuid:=private.current_organization_id();
 c_payment_plan_payments int:=0;c_payment_plans int:=0;c_payments_ledger int:=0;c_account_docs int:=0;c_account_notes int:=0;c_activity_logs int:=0;c_follow_ups int:=0;c_call_results int:=0;c_disputes int:=0;c_settlements int:=0;c_import_batches int:=0;c_accounts int:=0;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 delete from public.payment_plan_payments where organization_id=oid; get diagnostics c_payment_plan_payments=row_count;
 delete from public.payment_plans where organization_id=oid; get diagnostics c_payment_plans=row_count;
 delete from public.payments_ledger where organization_id=oid; get diagnostics c_payments_ledger=row_count;
 delete from public.account_docs where organization_id=oid; get diagnostics c_account_docs=row_count;
 delete from public.account_notes where organization_id=oid; get diagnostics c_account_notes=row_count;
 delete from public.activity_logs where organization_id=oid; get diagnostics c_activity_logs=row_count;
 delete from public.follow_ups where organization_id=oid; get diagnostics c_follow_ups=row_count;
 delete from public.call_results where organization_id=oid; get diagnostics c_call_results=row_count;
 delete from public.disputes where organization_id=oid; get diagnostics c_disputes=row_count;
 delete from public.settlements where organization_id=oid; get diagnostics c_settlements=row_count;
 delete from public.import_batches where organization_id=oid; get diagnostics c_import_batches=row_count;
 delete from public.accounts where organization_id=oid; get diagnostics c_accounts=row_count;
 return json_build_object('ok',true,'counts',json_build_object('accounts',c_accounts,'account_notes',c_account_notes,'activity_logs',c_activity_logs,'payment_plans',c_payment_plans,'payment_plan_payments',c_payment_plan_payments,'payments_ledger',c_payments_ledger,'account_docs',c_account_docs,'follow_ups',c_follow_ups,'call_results',c_call_results,'disputes',c_disputes,'settlements',c_settlements,'import_batches',c_import_batches));
end; $$;
revoke all on function public.admin_clear_accounts() from public,anon;
grant execute on function public.admin_clear_accounts() to authenticated;

-- DEMO compatibility: this older demo schema never received the current_app_email helper.
create or replace function public.current_app_email()
returns text language sql stable security invoker set search_path='' as $cpcm$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$cpcm$;
revoke all on function public.current_app_email() from public,anon;
grant execute on function public.current_app_email() to authenticated;

-- SOURCE: MULTI_TENANT_PHASE23_LEGACY_AUTH_HELPERS.sql
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 23
-- Replace legacy owner-email authorization helpers used by older RLS policies.

create or replace function public.is_app_admin()
returns boolean language sql stable set search_path=public as $$
  select private.is_platform_admin()
      or private.is_organization_admin(private.current_organization_id());
$$;

create or replace function public.is_approved_app_user()
returns boolean language sql security definer stable set search_path=public as $$
  select private.is_platform_admin()
     or exists (
       select 1 from public.app_users u
       where u.organization_id=private.current_organization_id()
         and lower(u.email)=public.current_app_email()
         and coalesce(u.is_approved,false)=true
         and coalesce(u.is_active,false)=true
         and lower(coalesce(u.approval_status,'pending'))='approved'
     );
$$;

create or replace function public.can_access_account(p_account_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select private.is_platform_admin()
     or exists (
       select 1 from public.accounts a
       where a.organization_id=private.current_organization_id()
         and a.id=p_account_id
         and public.is_approved_app_user()
         and (
           private.is_organization_admin(a.organization_id)
           or lower(coalesce(a.assigned_to_email,''))=public.current_app_email()
         )
     );
$$;
revoke all on function public.is_app_admin() from public,anon;
revoke all on function public.is_approved_app_user() from public,anon;
revoke all on function public.can_access_account(uuid) from public,anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_approved_app_user() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;

-- DEMO-specific readiness and structural isolation assertions.
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM public.organization_members WHERE is_active GROUP BY auth_user_id HAVING count(*)>1 LIMIT 1;
  IF n IS NOT NULL THEN RAISE EXCEPTION 'DEMO BLOCKED: login has multiple active organization memberships'; END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('app_users'),('accounts'),('account_notes'),('activity_logs'),('payment_plans'),('payment_plan_payments'),
      ('payment_promises'),('payments_ledger'),('account_docs'),('call_results'),('follow_ups'),('disputes'),('settlements'),
      ('audit_logs'),('role_permissions'),('import_batches'),('company_settings'),('collector_alerts'),('compliance_events'),
      ('client_portfolio_assignments'),('client_fee_schedules'),('client_remittance_batches'),('client_remittance_items'),
      ('team_messages'),('team_typing_status'),('team_presence')
    ) v(tbl)
    WHERE to_regclass('public.'||tbl) IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name='organization_id')
  ) THEN RAISE EXCEPTION 'DEMO BLOCKED: present core tenant table missing organization_id'; END IF;
  RAISE NOTICE 'DEMO CORE READINESS CHECKS PASSED';
END $$;

DO $$ DECLARE t text; p text; missing text[]:=ARRAY[]::text[]; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises',
    'payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions',
    'import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments',
    'client_fee_schedules','client_remittance_batches','client_remittance_items','team_messages','team_typing_status','team_presence'
  ] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN missing:=array_append(missing,t||':rls'); END IF;
      FOREACH p IN ARRAY ARRAY['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=p) THEN missing:=array_append(missing,t||':'||p); END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF cardinality(missing)>0 THEN RAISE EXCEPTION 'DEMO TENANT PRECHECK FAILED: %',array_to_string(missing,', '); END IF;
  RAISE NOTICE 'DEMO TENANT STRUCTURAL PRECHECK PASSED';
END $$;
COMMIT;
