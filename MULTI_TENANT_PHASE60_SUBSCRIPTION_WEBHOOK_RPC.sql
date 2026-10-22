-- Phase 60: service-only subscription state transition for payment webhooks.
-- This RPC is intentionally unavailable to browser roles. A trusted Edge Function using the service role may call it after verifying the gateway event.
begin;

create or replace function public.cpcm_service_set_subscription_state(
 p_organization_id uuid,
 p_status text,
 p_plan text default null,
 p_provider text default null,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null,
 p_cancel_at_period_end boolean default false
) returns text
language plpgsql security definer set search_path=''
as $$
declare
 clean_status text:=lower(coalesce(nullif(btrim(p_status),''),'pending_payment'));
 clean_plan text;
 is_demo_org boolean:=false;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_status not in ('pending_payment','active','past_due','cancelled') then raise exception 'Invalid subscription status'; end if;
 select coalesce(o.is_demo,false),coalesce(nullif(btrim(p_plan),''),o.plan,'standard')
   into is_demo_org,clean_plan
 from public.organizations o where o.id=p_organization_id;
 if clean_plan is null then raise exception 'Organization not found'; end if;
 if is_demo_org then raise exception 'Demo organizations are not managed by subscription billing'; end if;
 insert into public.organization_subscriptions(organization_id,plan,status,provider,provider_customer_id,provider_subscription_id,current_period_end,cancel_at_period_end,updated_at)
 values(p_organization_id,clean_plan,clean_status,nullif(btrim(p_provider),''),nullif(btrim(p_provider_customer_id),''),nullif(btrim(p_provider_subscription_id),''),p_current_period_end,coalesce(p_cancel_at_period_end,false),now())
 on conflict(organization_id) do update set
  plan=excluded.plan,status=excluded.status,
  provider=coalesce(excluded.provider,public.organization_subscriptions.provider),
  provider_customer_id=coalesce(excluded.provider_customer_id,public.organization_subscriptions.provider_customer_id),
  provider_subscription_id=coalesce(excluded.provider_subscription_id,public.organization_subscriptions.provider_subscription_id),
  current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now();
 update public.organizations set plan=clean_plan,status=clean_status,updated_at=now() where id=p_organization_id;
 return clean_status;
end
$$;

revoke all on function public.cpcm_service_set_subscription_state(uuid,text,text,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.cpcm_service_set_subscription_state(uuid,text,text,text,text,text,timestamptz,boolean) to service_role;
commit;
