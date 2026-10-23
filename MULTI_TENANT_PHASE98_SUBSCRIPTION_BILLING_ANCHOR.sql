-- Phase 98: persist the provider recurring billing anchor used by safe plan changes.
begin;
alter table public.organization_subscriptions add column if not exists billing_day_of_month integer;
alter table public.organization_subscriptions drop constraint if exists organization_subscriptions_billing_day_check;
alter table public.organization_subscriptions add constraint organization_subscriptions_billing_day_check check (billing_day_of_month is null or billing_day_of_month between 1 and 31);

create or replace function public.cpcm_service_set_subscription_billing_anchor(p_organization_id uuid,p_billing_day_of_month integer)
returns table(organization_id uuid,billing_day_of_month integer)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if p_billing_day_of_month not between 1 and 31 then raise exception 'Billing day must be between 1 and 31'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s set billing_day_of_month=p_billing_day_of_month,updated_at=now() where s.organization_id=p_organization_id;
 if not found then raise exception 'Subscription not found'; end if;
 return query select s.organization_id,s.billing_day_of_month from public.organization_subscriptions s where s.organization_id=p_organization_id;
end $$;
revoke all on function public.cpcm_service_set_subscription_billing_anchor(uuid,integer) from public,anon,authenticated;
grant execute on function public.cpcm_service_set_subscription_billing_anchor(uuid,integer) to service_role;

create or replace function public.cpcm_service_get_subscription_plan_change_handoff(p_request_id uuid)
returns table(request_id uuid,organization_id uuid,organization_name text,current_plan text,requested_plan text,requested_plan_name text,requested_billing_interval text,amount_cents integer,change_kind text,request_status text,provider text,provider_customer_id text,provider_subscription_id text,billing_day_of_month integer)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 select r.id,r.organization_id,o.name,r.current_plan,r.requested_plan,p.display_name,r.requested_billing_interval,r.amount_cents,r.change_kind,r.status,s.provider,s.provider_customer_id,s.provider_subscription_id,s.billing_day_of_month
 from public.subscription_plan_change_requests r join public.organizations o on o.id=r.organization_id join public.organization_subscriptions s on s.organization_id=r.organization_id join public.saas_plan_catalog p on p.plan_code=r.requested_plan and p.is_active=true
 where r.id=p_request_id and r.status='provider_pending' and coalesce(o.is_demo,false)=false;
end $$;
revoke all on function public.cpcm_service_get_subscription_plan_change_handoff(uuid) from public,anon,authenticated;
grant execute on function public.cpcm_service_get_subscription_plan_change_handoff(uuid) to service_role;
commit;
