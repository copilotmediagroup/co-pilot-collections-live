-- Phase 71: service-only recurring subscription lifecycle transitions.
begin;

create or replace function public.cpcm_service_apply_subscription_lifecycle(
 p_organization_id uuid,
 p_status text,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null,
 p_cancel_at_period_end boolean default null
)
returns table(organization_id uuid,subscription_status text,organization_status text,current_period_end timestamptz,cancel_at_period_end boolean)
language plpgsql security definer set search_path=''
as $$
declare clean_status text:=lower(trim(coalesce(p_status,''))); org_demo boolean;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_status not in ('active','past_due','cancelled') then raise exception 'Invalid subscription lifecycle status'; end if;
 select coalesce(o.is_demo,false) into org_demo from public.organizations o where o.id=p_organization_id;
 if not found then raise exception 'Organization not found'; end if;
 if org_demo then raise exception 'Demo organizations do not have production subscriptions'; end if;

 update public.organization_subscriptions s
 set status=clean_status,
     provider_customer_id=coalesce(nullif(trim(coalesce(p_provider_customer_id,'')),''),s.provider_customer_id),
     provider_subscription_id=coalesce(nullif(trim(coalesce(p_provider_subscription_id,'')),''),s.provider_subscription_id),
     current_period_end=coalesce(p_current_period_end,s.current_period_end),
     cancel_at_period_end=coalesce(p_cancel_at_period_end,s.cancel_at_period_end,false),
     updated_at=now()
 where s.organization_id=p_organization_id;
 if not found then raise exception 'Subscription not found'; end if;

 update public.organizations o
 set status=case clean_status when 'active' then 'active' when 'past_due' then 'past_due' else 'cancelled' end,
     updated_at=now()
 where o.id=p_organization_id;

 return query select s.organization_id,s.status,o.status,s.current_period_end,s.cancel_at_period_end
 from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id
 where s.organization_id=p_organization_id;
end $$;

revoke all on function public.cpcm_service_apply_subscription_lifecycle(uuid,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.cpcm_service_apply_subscription_lifecycle(uuid,text,text,text,timestamptz,boolean) to service_role;
commit;
