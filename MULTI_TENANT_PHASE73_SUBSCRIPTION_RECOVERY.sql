-- Phase 73: service-controlled renewal recovery and period-end cancellation.
begin;
alter table public.organization_subscriptions add column if not exists past_due_since timestamptz;
alter table public.organization_subscriptions add column if not exists last_payment_at timestamptz;
alter table public.organization_subscriptions add column if not exists next_payment_at timestamptz;

create or replace function public.cpcm_service_record_subscription_renewal(p_organization_id uuid,p_success boolean,p_current_period_end timestamptz default null,p_provider_customer_id text default null,p_provider_subscription_id text default null)
returns table(organization_id uuid,subscription_status text,organization_status text,current_period_end timestamptz,past_due_since timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org_demo boolean;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select coalesce(o.is_demo,false) into org_demo from public.organizations o where o.id=p_organization_id;
 if not found then raise exception 'Organization not found'; end if;
 if org_demo then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s set
  status=case when p_success then 'active' else 'past_due' end,
  provider_customer_id=coalesce(nullif(btrim(coalesce(p_provider_customer_id,'')),''),s.provider_customer_id),
  provider_subscription_id=coalesce(nullif(btrim(coalesce(p_provider_subscription_id,'')),''),s.provider_subscription_id),
  current_period_end=case when p_success then coalesce(p_current_period_end,s.current_period_end) else s.current_period_end end,
  last_payment_at=case when p_success then now() else s.last_payment_at end,
  next_payment_at=case when p_success then coalesce(p_current_period_end,s.next_payment_at) else s.next_payment_at end,
  past_due_since=case when p_success then null else coalesce(s.past_due_since,now()) end,
  updated_at=now()
 where s.organization_id=p_organization_id;
 if not found then raise exception 'Subscription not found'; end if;
 update public.organizations o set status=case when p_success then 'active' else 'past_due' end,updated_at=now() where o.id=p_organization_id;
 return query select s.organization_id,s.status,o.status,s.current_period_end,s.past_due_since from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id where s.organization_id=p_organization_id;
end $$;

create or replace function public.cpcm_service_finalize_due_subscription_cancellations(p_as_of timestamptz default now())
returns table(organization_id uuid,subscription_status text,organization_status text)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 with due as (
  update public.organization_subscriptions s set status='cancelled',updated_at=now()
  where s.cancel_at_period_end=true and s.status in ('active','past_due') and s.current_period_end is not null and s.current_period_end<=p_as_of
  returning s.organization_id,s.status
 ), orgs as (
  update public.organizations o set status='cancelled',updated_at=now() from due d where o.id=d.organization_id and coalesce(o.is_demo,false)=false returning o.id,o.status
 )
 select d.organization_id,d.status,o.status from due d join orgs o on o.id=d.organization_id;
end $$;
revoke all on function public.cpcm_service_record_subscription_renewal(uuid,boolean,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_record_subscription_renewal(uuid,boolean,timestamptz,text,text) to service_role;
revoke all on function public.cpcm_service_finalize_due_subscription_cancellations(timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_due_subscription_cancellations(timestamptz) to service_role;
commit;
