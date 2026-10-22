-- Phase 74: explicit service-controlled past-due grace policy and recovery visibility.
begin;
alter table public.organization_subscriptions add column if not exists grace_period_ends_at timestamptz;

create or replace function public.cpcm_service_set_subscription_grace(p_organization_id uuid,p_grace_period_ends_at timestamptz)
returns table(organization_id uuid,subscription_status text,grace_period_ends_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org_demo boolean;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select coalesce(o.is_demo,false) into org_demo from public.organizations o where o.id=p_organization_id;
 if not found then raise exception 'Organization not found'; end if;
 if org_demo then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s set grace_period_ends_at=p_grace_period_ends_at,updated_at=now()
 where s.organization_id=p_organization_id and s.status='past_due';
 if not found then raise exception 'Past-due subscription required'; end if;
 return query select s.organization_id,s.status,s.grace_period_ends_at from public.organization_subscriptions s where s.organization_id=p_organization_id;
end $$;

revoke all on function public.cpcm_service_set_subscription_grace(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.cpcm_service_set_subscription_grace(uuid,timestamptz) to service_role;
commit;
