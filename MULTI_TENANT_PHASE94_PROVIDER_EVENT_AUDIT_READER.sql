-- Phase 94: service-only audit reader for one SaaS subscription provider event.
-- Exposes provider-event processing state without exposing browser access or payment credentials.
begin;
create or replace function public.cpcm_service_saas_provider_event_audit(p_event_id uuid)
returns table(
 event_id uuid,provider text,provider_event_id text,organization_id uuid,event_type text,
 event_status text,provider_reference text,failure_message text,received_at timestamptz,
 processed_at timestamptz,updated_at timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 select e.id,e.provider,e.provider_event_id,e.organization_id,e.event_type,e.status,
        e.provider_reference,e.failure_message,e.received_at,e.processed_at,e.updated_at
 from public.saas_subscription_provider_events e
 left join public.organizations o on o.id=e.organization_id
 where e.id=p_event_id and (e.organization_id is null or coalesce(o.is_demo,false)=false);
end $$;
revoke all on function public.cpcm_service_saas_provider_event_audit(uuid) from public,anon,authenticated;
grant execute on function public.cpcm_service_saas_provider_event_audit(uuid) to service_role;
commit;
