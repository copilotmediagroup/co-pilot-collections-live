-- Phase 91: safely finalize a claimed SaaS provider event as ignored after trusted normalization determines it is not actionable.
-- This remains provider-neutral: the caller supplies the reason after claim/normalization; no provider webhook names are assumed.
begin;
create or replace function public.cpcm_service_ignore_claimed_saas_provider_event(
 p_event_id uuid,
 p_reason text
)
returns table(event_id uuid,event_status text,organization_id uuid,failure_message text,processed_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype; reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if reason is null then raise exception 'Ignore reason required'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Only received provider events can be ignored'; end if;
 if e.organization_id is not null and exists(select 1 from public.organizations o where o.id=e.organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not process production subscription provider events'; end if;
 update public.saas_subscription_provider_events
 set status='ignored',failure_message=reason,processed_at=coalesce(processed_at,now()),updated_at=now()
 where id=p_event_id;
 return query select x.id,x.status,x.organization_id,x.failure_message,x.processed_at from public.saas_subscription_provider_events x where x.id=p_event_id;
end $$;
revoke all on function public.cpcm_service_ignore_claimed_saas_provider_event(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_ignore_claimed_saas_provider_event(uuid,text) to service_role;
commit;
