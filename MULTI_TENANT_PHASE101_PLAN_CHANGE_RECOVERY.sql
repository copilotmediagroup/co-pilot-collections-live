-- Phase 101: durable recovery for provider-success/local-finalizer plan changes.
-- A provider_pending request remains recoverable after NMI has accepted the change.
begin;

create or replace function public.cpcm_service_record_plan_change_provider_success(p_request_id uuid,p_provider_reference text)
returns text language plpgsql security definer set search_path=''
as $$
declare clean_ref text:=nullif(btrim(p_provider_reference),'');
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_ref is null then raise exception 'Provider reference required'; end if;
 update public.subscription_plan_change_requests r set provider_reference=clean_ref,failure_message=null,updated_at=now()
 where r.id=p_request_id and r.status='provider_pending' and exists(select 1 from public.organizations o where o.id=r.organization_id and coalesce(o.is_demo,false)=false);
 if not found then raise exception 'Provider-pending production plan change not found'; end if;
 return 'provider_confirmed';
end $$;

create or replace function public.cpcm_service_provider_confirmed_plan_change_recovery(p_limit integer default 25)
returns table(request_id uuid,provider_reference text)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query select r.id,r.provider_reference from public.subscription_plan_change_requests r
 join public.organizations o on o.id=r.organization_id and coalesce(o.is_demo,false)=false
 where r.status='provider_pending' and r.provider_reference is not null
 order by r.updated_at asc limit greatest(1,least(coalesce(p_limit,25),100));
end $$;

revoke all on function public.cpcm_service_record_plan_change_provider_success(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_record_plan_change_provider_success(uuid,text) to service_role;
revoke all on function public.cpcm_service_provider_confirmed_plan_change_recovery(integer) from public,anon,authenticated;
grant execute on function public.cpcm_service_provider_confirmed_plan_change_recovery(integer) to service_role;
commit;
