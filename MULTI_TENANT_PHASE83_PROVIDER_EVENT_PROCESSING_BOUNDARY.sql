-- Phase 83: atomic normalized SaaS provider-event processing boundary.
-- Trusted edge code resolves provider identity first, claims the idempotency ledger, then applies only normalized lifecycle outcomes.
begin;
create or replace function public.cpcm_service_apply_normalized_saas_provider_event(
 p_event_id uuid,
 p_organization_id uuid,
 p_outcome text,
 p_current_period_end timestamptz default null,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_failure_message text default null
) returns table(event_id uuid,event_status text,organization_id uuid,subscription_status text,organization_status text)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype; outcome text:=lower(btrim(coalesce(p_outcome,''))); success boolean;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if outcome not in ('renewal_succeeded','renewal_failed') then raise exception 'Unsupported normalized SaaS provider outcome'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Provider event is already finalized'; end if;
 if e.organization_id is null or e.organization_id <> p_organization_id then raise exception 'Provider event organization mismatch'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not process production provider events'; end if;
 success := outcome='renewal_succeeded';
 perform public.cpcm_service_record_subscription_renewal(p_organization_id,success,p_current_period_end,p_provider_customer_id,p_provider_subscription_id);
 update public.saas_subscription_provider_events set status='processed',failure_message=null,processed_at=coalesce(processed_at,now()),updated_at=now() where id=p_event_id;
 return query select e2.id,e2.status,s.organization_id,s.status,o.status from public.saas_subscription_provider_events e2 join public.organization_subscriptions s on s.organization_id=p_organization_id join public.organizations o on o.id=s.organization_id where e2.id=p_event_id;
exception when others then
 -- The caller may finalize the claimed ledger row as failed after this transaction rolls back.
 raise;
end $$;
revoke all on function public.cpcm_service_apply_normalized_saas_provider_event(uuid,uuid,text,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_apply_normalized_saas_provider_event(uuid,uuid,text,timestamptz,text,text,text) to service_role;
commit;
