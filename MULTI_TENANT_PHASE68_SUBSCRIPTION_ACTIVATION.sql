-- Phase 68: service-only activation after a verified SaaS checkout payment.
-- Checkout ownership, canonical plan, amount and interval come from server-side checkout records.
begin;

create or replace function public.cpcm_service_activate_paid_subscription(
 p_checkout_id uuid,
 p_provider_reference text,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null
) returns text
language plpgsql security definer set search_path=''
as $$
declare
 c public.subscription_checkout_attempts%rowtype;
 period_end timestamptz;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 select * into c from public.subscription_checkout_attempts where id=p_checkout_id for update;
 if c.id is null then raise exception 'Checkout not found'; end if;
 if c.status not in ('submitted','paid') then raise exception 'Checkout is not eligible for activation'; end if;
 if nullif(btrim(p_provider_reference),'') is null then raise exception 'Provider reference required'; end if;
 if c.billing_interval not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 period_end:=coalesce(p_current_period_end,case when c.billing_interval='annual' then now()+interval '1 year' else now()+interval '1 month' end);

 insert into public.organization_subscriptions(organization_id,plan,status,provider,provider_customer_id,provider_subscription_id,billing_interval,current_period_end,cancel_at_period_end,last_payment_at,next_payment_at,updated_at)
 values(c.organization_id,c.plan_code,'active','nmi_easy_pay_direct',nullif(btrim(p_provider_customer_id),''),nullif(btrim(p_provider_subscription_id),''),c.billing_interval,period_end,false,now(),period_end,now())
 on conflict(organization_id) do update set
  plan=excluded.plan,status='active',provider='nmi_easy_pay_direct',
  provider_customer_id=coalesce(excluded.provider_customer_id,public.organization_subscriptions.provider_customer_id),
  provider_subscription_id=coalesce(excluded.provider_subscription_id,public.organization_subscriptions.provider_subscription_id),
  billing_interval=excluded.billing_interval,current_period_end=excluded.current_period_end,cancel_at_period_end=false,
  last_payment_at=now(),next_payment_at=excluded.current_period_end,updated_at=now();

 update public.organizations set plan=c.plan_code,status='active',updated_at=now() where id=c.organization_id and coalesce(is_demo,false)=false;
 if not found then raise exception 'Production organization not found'; end if;

 update public.subscription_checkout_attempts set status='paid',provider_reference=nullif(btrim(p_provider_reference),''),failure_message=null,completed_at=coalesce(completed_at,now()),updated_at=now() where id=c.id;
 return 'active';
end
$$;

revoke all on function public.cpcm_service_activate_paid_subscription(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_activate_paid_subscription(uuid,text,text,text,timestamptz) to service_role;
commit;
