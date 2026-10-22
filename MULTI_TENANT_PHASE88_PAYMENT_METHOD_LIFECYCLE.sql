-- Phase 88: safe service-only lifecycle controls for stored SaaS payment-method metadata.
-- This manages masked metadata only. It never stores or accepts PAN, CVV, or vault/payment tokens.
begin;

create or replace function public.cpcm_service_set_saas_payment_method_status(
 p_organization_id uuid,
 p_status text
)
returns table(organization_id uuid,provider text,brand text,last4 text,exp_month integer,exp_year integer,status text,updated_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare clean_status text:=lower(btrim(coalesce(p_status,'')));
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_status not in ('active','expired','removed','unknown') then raise exception 'Invalid payment method status'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscription payment methods'; end if;
 update public.saas_subscription_payment_methods m
 set status=clean_status,updated_at=now()
 where m.organization_id=p_organization_id;
 if not found then raise exception 'Subscription payment method metadata not found'; end if;
 return query select m.organization_id,m.provider,m.brand,m.last4,m.exp_month,m.exp_year,m.status,m.updated_at
 from public.saas_subscription_payment_methods m where m.organization_id=p_organization_id;
end $$;

revoke all on function public.cpcm_service_set_saas_payment_method_status(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_set_saas_payment_method_status(uuid,text) to service_role;
commit;
