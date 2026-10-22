-- Phase 75: durable, auditable subscription plan-change requests.
begin;
create table if not exists public.subscription_plan_change_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 requested_by uuid not null,
 current_plan text not null,
 requested_plan text not null,
 requested_billing_interval text not null check (requested_billing_interval in ('monthly','annual')),
 change_kind text not null check (change_kind in ('upgrade','downgrade','billing_interval_change')),
 amount_cents integer not null check (amount_cents >= 0),
 status text not null default 'requested' check (status in ('requested','provider_pending','applied','failed','cancelled')),
 provider_reference text,
 failure_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists subscription_plan_change_requests_org_created_idx on public.subscription_plan_change_requests(organization_id,created_at desc);
alter table public.subscription_plan_change_requests enable row level security;
revoke all on public.subscription_plan_change_requests from public,anon,authenticated;

create or replace function public.cpcm_create_subscription_plan_change_request(p_plan_code text,p_billing_interval text)
returns table(request_id uuid,organization_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer,status text)
language plpgsql security definer set search_path=''
as $$
declare v record; rid uuid;
begin
 select * into v from public.cpcm_request_subscription_plan_change(p_plan_code,p_billing_interval);
 if v.organization_id is null then raise exception 'Plan change validation failed'; end if;
 if v.change_kind='no_change' then raise exception 'Subscription already uses this plan and billing interval'; end if;
 if exists(select 1 from public.subscription_plan_change_requests r where r.organization_id=v.organization_id and r.status in ('requested','provider_pending')) then raise exception 'A subscription plan change is already pending'; end if;
 insert into public.subscription_plan_change_requests(organization_id,requested_by,current_plan,requested_plan,requested_billing_interval,change_kind,amount_cents)
 values(v.organization_id,auth.uid(),v.current_plan,v.requested_plan,v.requested_billing_interval,v.change_kind,v.amount_cents) returning id into rid;
 return query select r.id,r.organization_id,r.current_plan,r.requested_plan,r.requested_billing_interval,r.change_kind,r.amount_cents,r.status from public.subscription_plan_change_requests r where r.id=rid;
end $$;

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
  select count(*) into active_users from public.organization_members m where m.organization_id=r.organization_id and m.status='active';
  select count(*) into account_count from public.accounts a where a.organization_id=r.organization_id;
  if active_users>lim_users or account_count>lim_accounts then raise exception 'Organization exceeds requested plan capacity'; end if;
  update public.organization_subscriptions s set plan=r.requested_plan,billing_interval=r.requested_billing_interval,updated_at=now() where s.organization_id=r.organization_id and s.status in ('active','past_due');
  if not found then raise exception 'Active subscription not found'; end if;
  update public.organizations o set plan=r.requested_plan,updated_at=now() where o.id=r.organization_id;
 end if;
 update public.subscription_plan_change_requests set status=case when p_success then 'applied' else 'failed' end,provider_reference=nullif(btrim(coalesce(p_provider_reference,'')),''),failure_message=case when p_success then null else nullif(btrim(coalesce(p_failure_message,'')),'') end,completed_at=now(),updated_at=now() where id=p_request_id;
 return query select r.id,r.organization_id,s.plan,s.billing_interval,case when p_success then 'applied' else 'failed' end from public.organization_subscriptions s where s.organization_id=r.organization_id;
end $$;

revoke all on function public.cpcm_create_subscription_plan_change_request(text,text) from public,anon;
grant execute on function public.cpcm_create_subscription_plan_change_request(text,text) to authenticated;
revoke all on function public.cpcm_service_finalize_subscription_plan_change(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_subscription_plan_change(uuid,boolean,text,text) to service_role;
commit;
