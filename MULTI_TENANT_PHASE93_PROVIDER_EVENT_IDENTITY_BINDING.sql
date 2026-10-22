-- Phase 93: atomically resolve trusted provider identity and bind a received SaaS provider event to that tenant.
-- Provider-specific webhook parsing/signature verification remains outside this provider-neutral boundary.
begin;
create or replace function public.cpcm_service_resolve_and_bind_saas_provider_event(
 p_event_id uuid,
 p_provider text,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null
)
returns table(event_id uuid,event_status text,organization_id uuid,organization_name text,subscription_status text,plan text,billing_interval text)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype; resolved record; p text:=lower(btrim(coalesce(p_provider,'')));
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if p='' then raise exception 'Provider required'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Only received provider events can be resolved and bound'; end if;
 if lower(coalesce(e.provider,'')) <> p then raise exception 'Provider event provider does not match supplied provider'; end if;
 select * into resolved from public.cpcm_service_resolve_saas_provider_organization(p,p_provider_customer_id,p_provider_subscription_id);
 if resolved.organization_id is null then raise exception 'Provider identity did not resolve to an organization'; end if;
 if e.organization_id is not null and e.organization_id <> resolved.organization_id then raise exception 'Provider event is already bound to another organization'; end if;
 perform public.cpcm_service_bind_saas_provider_event_organization(p_event_id,resolved.organization_id);
 return query select x.id,x.status,resolved.organization_id,resolved.organization_name,resolved.subscription_status,resolved.plan,resolved.billing_interval from public.saas_subscription_provider_events x where x.id=p_event_id;
end $$;
revoke all on function public.cpcm_service_resolve_and_bind_saas_provider_event(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_resolve_and_bind_saas_provider_event(uuid,text,text,text) to service_role;
commit;
