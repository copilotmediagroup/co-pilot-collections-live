-- Phase 81: service-only provider handoff snapshot for durable SaaS plan-change processing.
-- This exposes canonical, non-card data to a trusted edge/service worker after Phase 77 claims the request.
begin;
create or replace function public.cpcm_service_get_subscription_plan_change_handoff(p_request_id uuid)
returns table(request_id uuid,organization_id uuid,organization_name text,current_plan text,requested_plan text,requested_plan_name text,requested_billing_interval text,amount_cents integer,change_kind text,request_status text,provider text,provider_customer_id text,provider_subscription_id text)
language plpgsql stable security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 select r.id,r.organization_id,o.name,r.current_plan,r.requested_plan,p.display_name,r.requested_billing_interval,r.amount_cents,r.change_kind,r.status,s.provider,s.provider_customer_id,s.provider_subscription_id
 from public.subscription_plan_change_requests r
 join public.organizations o on o.id=r.organization_id
 join public.organization_subscriptions s on s.organization_id=r.organization_id
 join public.saas_plan_catalog p on p.plan_code=r.requested_plan and p.is_active=true
 where r.id=p_request_id and r.status='provider_pending' and coalesce(o.is_demo,false)=false;
 if not found then raise exception 'Provider-pending plan change not found'; end if;
end $$;
revoke all on function public.cpcm_service_get_subscription_plan_change_handoff(uuid) from public,anon,authenticated;
grant execute on function public.cpcm_service_get_subscription_plan_change_handoff(uuid) to service_role;
commit;
