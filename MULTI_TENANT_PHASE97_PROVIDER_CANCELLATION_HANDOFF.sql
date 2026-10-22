-- Phase 97: provider-first period-end cancellation handoff.
-- A paid NMI subscription is not marked cancelled locally until provider deletion succeeds.
begin;

create or replace function public.cpcm_service_due_subscription_cancellation_handoff(p_as_of timestamptz default now(),p_limit integer default 50)
returns table(organization_id uuid,provider_subscription_id text,current_period_end timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 return query
 select s.organization_id,s.provider_subscription_id,s.current_period_end
 from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id
 where s.cancel_at_period_end=true and s.status in ('active','past_due')
   and s.current_period_end is not null and s.current_period_end<=p_as_of
   and nullif(btrim(coalesce(s.provider_subscription_id,'')),'') is not null
   and coalesce(o.is_demo,false)=false
 order by s.current_period_end asc
 limit greatest(1,least(coalesce(p_limit,50),200));
end $$;

create or replace function public.cpcm_service_finalize_provider_subscription_cancellation(p_organization_id uuid,p_provider_subscription_id text)
returns table(organization_id uuid,subscription_status text,organization_status text)
language plpgsql security definer set search_path=''
as $$
declare clean_provider_id text:=nullif(btrim(coalesce(p_provider_subscription_id,'')),'');
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if clean_provider_id is null then raise exception 'Provider subscription ID required'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s
 set status='cancelled',cancel_at_period_end=false,next_payment_at=null,updated_at=now()
 where s.organization_id=p_organization_id and s.cancel_at_period_end=true and s.status in ('active','past_due')
   and s.current_period_end is not null and s.current_period_end<=now()
   and s.provider_subscription_id=clean_provider_id;
 if not found then raise exception 'Due provider cancellation not found or provider identity mismatch'; end if;
 update public.organizations o set status='cancelled',updated_at=now() where o.id=p_organization_id and coalesce(o.is_demo,false)=false;
 if not found then raise exception 'Production organization not found'; end if;
 return query select s.organization_id,s.status,o.status from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id where s.organization_id=p_organization_id;
end $$;

-- Retire the unsafe local-only period-end finalizer. Provider-backed subscriptions must be deleted upstream first.
create or replace function public.cpcm_service_finalize_due_subscription_cancellations(p_as_of timestamptz default now())
returns table(organization_id uuid,subscription_status text,organization_status text)
language plpgsql security definer set search_path=''
as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 raise exception 'Provider-first cancellation required; use cpcm_service_due_subscription_cancellation_handoff and cpcm_service_finalize_provider_subscription_cancellation';
end $$;

revoke all on function public.cpcm_service_due_subscription_cancellation_handoff(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.cpcm_service_due_subscription_cancellation_handoff(timestamptz,integer) to service_role;
revoke all on function public.cpcm_service_finalize_provider_subscription_cancellation(uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_provider_subscription_cancellation(uuid,text) to service_role;
revoke all on function public.cpcm_service_finalize_due_subscription_cancellations(timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_due_subscription_cancellations(timestamptz) to service_role;
commit;
