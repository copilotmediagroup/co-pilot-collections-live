-- Phase 82: safely resolve normalized SaaS provider events to an organization using server-held provider identities.
-- No webhook signature/event-name contract is invented here; a trusted edge worker supplies normalized provider identifiers.
begin;
create or replace function public.cpcm_service_resolve_saas_provider_organization(p_provider text,p_provider_customer_id text default null,p_provider_subscription_id text default null)
returns table(organization_id uuid,organization_name text,subscription_status text,plan text,billing_interval text)
language plpgsql stable security definer set search_path=''
as $$
declare p text:=lower(btrim(coalesce(p_provider,''))); cid text:=nullif(btrim(coalesce(p_provider_customer_id,'')),''); sid text:=nullif(btrim(coalesce(p_provider_subscription_id,'')),''); matches integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if p='' or (cid is null and sid is null) then raise exception 'Provider and provider customer or subscription id are required'; end if;
 select count(*) into matches
 from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id
 where lower(coalesce(s.provider,''))=p and coalesce(o.is_demo,false)=false
   and ((sid is not null and s.provider_subscription_id=sid) or (cid is not null and s.provider_customer_id=cid));
 if matches=0 then return; end if;
 if matches>1 then raise exception 'Provider identity matched multiple organizations'; end if;
 return query
 select o.id,o.name,s.status,s.plan,s.billing_interval
 from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id
 where lower(coalesce(s.provider,''))=p and coalesce(o.is_demo,false)=false
   and ((sid is not null and s.provider_subscription_id=sid) or (cid is not null and s.provider_customer_id=cid))
 limit 1;
end $$;
revoke all on function public.cpcm_service_resolve_saas_provider_organization(text,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_resolve_saas_provider_organization(text,text,text) to service_role;
commit;
