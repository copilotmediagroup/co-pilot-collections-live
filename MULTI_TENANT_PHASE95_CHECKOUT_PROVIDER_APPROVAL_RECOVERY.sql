-- Phase 95: preserve provider-approved SaaS subscriptions if local activation needs recovery.
-- Prevents a successful NMI subscription from being mislabeled failed and charged again on retry.
begin;

alter table public.subscription_checkout_attempts drop constraint if exists subscription_checkout_attempts_status_check;
alter table public.subscription_checkout_attempts add constraint subscription_checkout_attempts_status_check check (status in ('prepared','submitted','provider_approved','paid','failed','cancelled'));

create or replace function public.cpcm_service_record_subscription_provider_approval(
 p_checkout_id uuid,
 p_provider_reference text
) returns text
language plpgsql security definer set search_path=''
as $$
declare clean_ref text:=nullif(btrim(p_provider_reference),'');
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_ref is null then raise exception 'Provider reference required'; end if;
 update public.subscription_checkout_attempts
 set status='provider_approved',provider_reference=clean_ref,failure_message=null,updated_at=now()
 where id=p_checkout_id and status='submitted';
 if not found then raise exception 'Submitted checkout not found'; end if;
 return 'provider_approved';
end
$$;

create or replace function public.cpcm_service_activate_paid_subscription(
 p_checkout_id uuid,
 p_provider_reference text,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null
) returns text
language plpgsql security definer set search_path=''
as $$
declare c public.subscription_checkout_attempts%rowtype; period_end timestamptz;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 select * into c from public.subscription_checkout_attempts where id=p_checkout_id for update;
 if c.id is null then raise exception 'Checkout not found'; end if;
 if c.status not in ('provider_approved','paid') then raise exception 'Checkout is not eligible for activation'; end if;
 if nullif(btrim(p_provider_reference),'') is null then raise exception 'Provider reference required'; end if;
 if c.provider_reference is not null and c.provider_reference<>nullif(btrim(p_provider_reference),'') then raise exception 'Provider reference mismatch'; end if;
 if c.billing_interval not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 period_end:=coalesce(p_current_period_end,case when c.billing_interval='annual' then now()+interval '1 year' else now()+interval '1 month' end);
 insert into public.organization_subscriptions(organization_id,plan,status,provider,provider_customer_id,provider_subscription_id,billing_interval,current_period_end,cancel_at_period_end,last_payment_at,next_payment_at,updated_at)
 values(c.organization_id,c.plan_code,'active','nmi_easy_pay_direct',nullif(btrim(p_provider_customer_id),''),nullif(btrim(p_provider_subscription_id),''),c.billing_interval,period_end,false,now(),period_end,now())
 on conflict(organization_id) do update set plan=excluded.plan,status='active',provider='nmi_easy_pay_direct',provider_customer_id=coalesce(excluded.provider_customer_id,public.organization_subscriptions.provider_customer_id),provider_subscription_id=coalesce(excluded.provider_subscription_id,public.organization_subscriptions.provider_subscription_id),billing_interval=excluded.billing_interval,current_period_end=excluded.current_period_end,cancel_at_period_end=false,last_payment_at=now(),next_payment_at=excluded.current_period_end,updated_at=now();
 update public.organizations set plan=c.plan_code,status='active',updated_at=now() where id=c.organization_id and coalesce(is_demo,false)=false;
 if not found then raise exception 'Production organization not found'; end if;
 update public.subscription_checkout_attempts set status='paid',provider_reference=nullif(btrim(p_provider_reference),''),failure_message=null,completed_at=coalesce(completed_at,now()),updated_at=now() where id=c.id;
 return 'active';
end
$$;

revoke all on function public.cpcm_service_record_subscription_provider_approval(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_record_subscription_provider_approval(uuid,text) to service_role;
revoke all on function public.cpcm_service_activate_paid_subscription(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_activate_paid_subscription(uuid,text,text,text,timestamptz) to service_role;
commit;
