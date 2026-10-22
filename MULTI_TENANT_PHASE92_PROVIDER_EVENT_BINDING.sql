-- Phase 92: bind an already-claimed provider event to the tenant resolved from trusted provider identity.
-- Provider-specific webhook parsing remains outside this boundary.
begin;
create or replace function public.cpcm_service_bind_saas_provider_event_organization(
 p_event_id uuid,
 p_organization_id uuid
)
returns table(event_id uuid,event_status text,organization_id uuid,provider text,event_type text)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if p_organization_id is null then raise exception 'Organization required'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not process production subscription provider events'; end if;
 if not exists(select 1 from public.organizations o where o.id=p_organization_id) then raise exception 'Organization not found'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Only received provider events can be bound'; end if;
 if e.organization_id is not null and e.organization_id <> p_organization_id then raise exception 'Provider event is already bound to another organization'; end if;
 update public.saas_subscription_provider_events x set organization_id=p_organization_id,updated_at=now() where x.id=p_event_id;
 return query select x.id,x.status,x.organization_id,x.provider,x.event_type from public.saas_subscription_provider_events x where x.id=p_event_id;
end $$;
revoke all on function public.cpcm_service_bind_saas_provider_event_organization(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cpcm_service_bind_saas_provider_event_organization(uuid,uuid) to service_role;
commit;
