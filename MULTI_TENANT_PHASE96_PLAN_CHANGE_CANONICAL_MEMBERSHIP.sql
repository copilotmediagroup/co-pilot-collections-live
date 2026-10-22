-- Phase 96: canonical membership hardening for provider-confirmed plan changes.
-- Replaces the Phase75 service finalizer so fresh installs use organization_members.is_active.
begin;

create or replace function public.cpcm_service_finalize_subscription_plan_change(p_request_id uuid,p_success boolean,p_provider_reference text default null,p_failure_message text default null)
returns table(request_id uuid,organization_id uuid,subscription_plan text,billing_interval text,request_status text)
language plpgsql security definer set search_path=''
as $$
declare r public.subscription_plan_change_requests%rowtype; active_users bigint; account_count bigint; lim_users integer; lim_accounts integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select * into r from public.subscription_plan_change_requests where id=p_request_id for update;
 if not found then raise exception 'Plan change request not found'; end if;
 if r.status not in ('requested','provider_pending') then raise exception 'Plan change request is already finalized'; end if;
 if exists(select 1 from public.organizations o where o.id=r.organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 if p_success then
  select p.included_users,p.included_accounts into lim_users,lim_accounts from public.saas_plan_catalog p where p.plan_code=r.requested_plan and p.is_active=true;
  if not found then raise exception 'Requested plan is no longer available'; end if;
  select count(*) into active_users from public.organization_members m where m.organization_id=r.organization_id and m.is_active=true;
  select count(*) into account_count from public.accounts a where a.organization_id=r.organization_id;
  if active_users>lim_users or account_count>lim_accounts then raise exception 'Organization exceeds requested plan capacity'; end if;
  update public.organization_subscriptions s set plan=r.requested_plan,billing_interval=r.requested_billing_interval,updated_at=now() where s.organization_id=r.organization_id and s.status in ('active','past_due');
  if not found then raise exception 'Active subscription not found'; end if;
  update public.organizations o set plan=r.requested_plan,updated_at=now() where o.id=r.organization_id;
 end if;
 update public.subscription_plan_change_requests set status=case when p_success then 'applied' else 'failed' end,provider_reference=nullif(btrim(coalesce(p_provider_reference,'')),''),failure_message=case when p_success then null else nullif(btrim(coalesce(p_failure_message,'')),'') end,completed_at=now(),updated_at=now() where id=p_request_id;
 return query select r.id,r.organization_id,s.plan,s.billing_interval,case when p_success then 'applied' else 'failed' end from public.organization_subscriptions s where s.organization_id=r.organization_id;
end $$;

revoke all on function public.cpcm_service_finalize_subscription_plan_change(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_subscription_plan_change(uuid,boolean,text,text) to service_role;
commit;
