-- Phase 85: normalized provider-event processing for subscription cancellation confirmation.
-- Provider-specific webhook names remain outside this boundary; trusted service code supplies the normalized cancellation result.
begin;
create or replace function public.cpcm_service_apply_normalized_subscription_cancellation_event(
 p_event_id uuid,
 p_organization_id uuid,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null
) returns table(event_id uuid,event_status text,organization_id uuid,subscription_status text,organization_status text,cancel_at_period_end boolean)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype; s public.organization_subscriptions%rowtype;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Provider event is already finalized'; end if;
 if e.organization_id is null or e.organization_id <> p_organization_id then raise exception 'Provider event organization mismatch'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not process production provider events'; end if;
 select * into s from public.organization_subscriptions where organization_id=p_organization_id for update;
 if s.organization_id is null then raise exception 'Subscription not found'; end if;
 if s.status not in ('active','past_due') then raise exception 'Active or past-due subscription required'; end if;
 if not coalesce(s.cancel_at_period_end,false) then raise exception 'Cancellation was not requested'; end if;
 perform public.cpcm_service_apply_subscription_lifecycle(p_organization_id,'cancelled',p_provider_customer_id,p_provider_subscription_id,p_current_period_end,true);
 update public.saas_subscription_provider_events set status='processed',failure_message=null,processed_at=coalesce(processed_at,now()),updated_at=now() where id=p_event_id;
 return query select e2.id,e2.status,s2.organization_id,s2.status,o.status,s2.cancel_at_period_end from public.saas_subscription_provider_events e2 join public.organization_subscriptions s2 on s2.organization_id=p_organization_id join public.organizations o on o.id=s2.organization_id where e2.id=p_event_id;
exception when others then
 -- Caller may finalize the claimed ledger row as failed after this transaction rolls back.
 raise;
end $$;
revoke all on function public.cpcm_service_apply_normalized_subscription_cancellation_event(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_apply_normalized_subscription_cancellation_event(uuid,uuid,text,text,timestamptz) to service_role;
commit;
