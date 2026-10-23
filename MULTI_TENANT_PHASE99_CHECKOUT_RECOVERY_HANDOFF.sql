-- Phase 99: durable provider-approved checkout recovery handoff.
-- Stores only provider identifiers and billing timing needed to finish local activation; never card data or payment tokens.
begin;

alter table public.subscription_checkout_attempts add column if not exists provider_customer_id text;
alter table public.subscription_checkout_attempts add column if not exists provider_subscription_id text;
alter table public.subscription_checkout_attempts add column if not exists provider_period_end timestamptz;
alter table public.subscription_checkout_attempts add column if not exists provider_billing_day integer;
alter table public.subscription_checkout_attempts drop constraint if exists subscription_checkout_provider_billing_day_check;
alter table public.subscription_checkout_attempts add constraint subscription_checkout_provider_billing_day_check check (provider_billing_day is null or provider_billing_day between 1 and 31);

drop function if exists public.cpcm_service_record_subscription_provider_approval(uuid,text);

create or replace function public.cpcm_service_record_subscription_provider_approval(
 p_checkout_id uuid,
 p_provider_reference text,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_provider_period_end timestamptz default null,
 p_provider_billing_day integer default null
) returns text
language plpgsql security definer set search_path=''
as $$
declare clean_ref text:=nullif(btrim(p_provider_reference),'');
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_ref is null then raise exception 'Provider reference required'; end if;
 if p_provider_billing_day is not null and p_provider_billing_day not between 1 and 31 then raise exception 'Invalid provider billing day'; end if;
 update public.subscription_checkout_attempts
 set status='provider_approved',provider_reference=clean_ref,
     provider_customer_id=nullif(btrim(p_provider_customer_id),''),
     provider_subscription_id=coalesce(nullif(btrim(p_provider_subscription_id),''),clean_ref),
     provider_period_end=p_provider_period_end,provider_billing_day=p_provider_billing_day,
     failure_message=null,updated_at=now()
 where id=p_checkout_id and status='submitted';
 if not found then raise exception 'Submitted checkout not found'; end if;
 return 'provider_approved';
end
$$;

create or replace function public.cpcm_service_provider_approved_checkout_recovery(p_limit integer default 25)
returns table(checkout_id uuid,organization_id uuid,provider_reference text,provider_customer_id text,provider_subscription_id text,provider_period_end timestamptz,provider_billing_day integer)
language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 select c.id,c.organization_id,c.provider_reference,c.provider_customer_id,c.provider_subscription_id,c.provider_period_end,c.provider_billing_day
 from public.subscription_checkout_attempts c
 join public.organizations o on o.id=c.organization_id and coalesce(o.is_demo,false)=false
 where c.status='provider_approved' and c.provider_reference is not null and c.provider_subscription_id is not null
 order by c.updated_at asc limit greatest(1,least(coalesce(p_limit,25),100));
end
$$;

revoke all on function public.cpcm_service_record_subscription_provider_approval(uuid,text,text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.cpcm_service_record_subscription_provider_approval(uuid,text,text,text,timestamptz,integer) to service_role;
revoke all on function public.cpcm_service_provider_approved_checkout_recovery(integer) from public,anon,authenticated;
grant execute on function public.cpcm_service_provider_approved_checkout_recovery(integer) to service_role;
commit;
