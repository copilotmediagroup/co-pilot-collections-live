-- Phase 100: atomically finalize provider-approved checkout activation and billing anchor.
-- Provider identifiers/timing must already be durably recorded by Phase 99; no card data or payment token is accepted here.
begin;

create or replace function public.cpcm_service_activate_provider_approved_subscription(
 p_checkout_id uuid,
 p_provider_reference text
) returns text
language plpgsql security definer set search_path=''
as $$
declare
 c public.subscription_checkout_attempts%rowtype;
 clean_ref text:=nullif(btrim(p_provider_reference),'');
 period_end timestamptz;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_ref is null then raise exception 'Provider reference required'; end if;
 select * into c from public.subscription_checkout_attempts where id=p_checkout_id for update;
 if c.id is null then raise exception 'Checkout not found'; end if;
 if c.status not in ('provider_approved','paid') then raise exception 'Checkout is not eligible for activation'; end if;
 if c.provider_reference is null or c.provider_reference<>clean_ref then raise exception 'Provider reference mismatch'; end if;
 if c.provider_subscription_id is null or btrim(c.provider_subscription_id)='' then raise exception 'Provider subscription id required'; end if;
 if c.provider_billing_day is null or c.provider_billing_day not between 1 and 31 then raise exception 'Provider billing day required'; end if;
 if c.billing_interval not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 if exists(select 1 from public.organizations o where o.id=c.organization_id and coalesce(o.is_demo,false)=true) then raise exception 'Demo organizations cannot activate paid subscriptions'; end if;
 period_end:=coalesce(c.provider_period_end,case when c.billing_interval='annual' then now()+interval '1 year' else now()+interval '1 month' end);
 insert into public.organization_subscriptions(organization_id,plan,status,provider,provider_customer_id,provider_subscription_id,billing_interval,current_period_end,cancel_at_period_end,last_payment_at,next_payment_at,billing_day_of_month,updated_at)
 values(c.organization_id,c.plan_code,'active','nmi_easy_pay_direct',c.provider_customer_id,c.provider_subscription_id,c.billing_interval,period_end,false,now(),period_end,c.provider_billing_day,now())
 on conflict(organization_id) do update set plan=excluded.plan,status='active',provider='nmi_easy_pay_direct',provider_customer_id=coalesce(excluded.provider_customer_id,public.organization_subscriptions.provider_customer_id),provider_subscription_id=excluded.provider_subscription_id,billing_interval=excluded.billing_interval,current_period_end=excluded.current_period_end,cancel_at_period_end=false,last_payment_at=now(),next_payment_at=excluded.current_period_end,billing_day_of_month=excluded.billing_day_of_month,updated_at=now();
 update public.organizations set plan=c.plan_code,status='active',updated_at=now() where id=c.organization_id and coalesce(is_demo,false)=false;
 if not found then raise exception 'Production organization not found'; end if;
 update public.subscription_checkout_attempts set status='paid',failure_message=null,completed_at=coalesce(completed_at,now()),updated_at=now() where id=c.id;
 return 'active';
end
$$;

revoke all on function public.cpcm_service_activate_provider_approved_subscription(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_activate_provider_approved_subscription(uuid,text) to service_role;
commit;
