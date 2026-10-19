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
