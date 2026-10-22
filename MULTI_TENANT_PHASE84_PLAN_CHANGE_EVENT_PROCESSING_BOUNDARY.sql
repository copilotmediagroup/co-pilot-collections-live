-- Phase 84: atomic normalized provider-event processing for a claimed SaaS plan-change request.
-- Provider-specific webhook names/payloads stay outside this SQL boundary; trusted service code supplies the normalized result.
begin;
create or replace function public.cpcm_service_apply_normalized_plan_change_provider_event(
 p_event_id uuid,
 p_request_id uuid,
 p_organization_id uuid,
 p_success boolean,
 p_provider_reference text default null,
 p_failure_message text default null
) returns table(event_id uuid,event_status text,request_id uuid,request_status text,organization_id uuid,subscription_plan text,billing_interval text)
language plpgsql security definer set search_path=''
as $$
declare e public.saas_subscription_provider_events%rowtype; r public.subscription_plan_change_requests%rowtype;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select * into e from public.saas_subscription_provider_events where id=p_event_id for update;
 if e.id is null then raise exception 'Provider event not found'; end if;
 if e.status <> 'received' then raise exception 'Provider event is already finalized'; end if;
 if e.organization_id is null or e.organization_id <> p_organization_id then raise exception 'Provider event organization mismatch'; end if;
 select * into r from public.subscription_plan_change_requests where id=p_request_id for update;
 if r.id is null then raise exception 'Plan change request not found'; end if;
 if r.organization_id <> p_organization_id then raise exception 'Plan change request organization mismatch'; end if;
 if r.status <> 'provider_pending' then raise exception 'Provider-pending plan change required'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not process production provider events'; end if;
 perform public.cpcm_service_finalize_subscription_plan_change(p_request_id,p_success,p_provider_reference,p_failure_message);
 update public.saas_subscription_provider_events set status='processed',failure_message=null,processed_at=coalesce(processed_at,now()),updated_at=now() where id=p_event_id;
 return query select e2.id,e2.status,r2.id,r2.status,r2.organization_id,s.plan,s.billing_interval from public.saas_subscription_provider_events e2 join public.subscription_plan_change_requests r2 on r2.id=p_request_id join public.organization_subscriptions s on s.organization_id=r2.organization_id where e2.id=p_event_id;
exception when others then
 -- Caller may finalize the claimed ledger row as failed after this transaction rolls back.
 raise;
end $$;
revoke all on function public.cpcm_service_apply_normalized_plan_change_provider_event(uuid,uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_apply_normalized_plan_change_provider_event(uuid,uuid,uuid,boolean,text,text) to service_role;
commit;
