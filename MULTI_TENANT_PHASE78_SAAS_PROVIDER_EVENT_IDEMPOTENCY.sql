-- Phase 78: SaaS subscription provider-event idempotency, separate from debtor payment events.
begin;
create table if not exists public.saas_subscription_provider_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null,
 provider_event_id text not null,
 organization_id uuid references public.organizations(id) on delete set null,
 event_type text not null,
 status text not null default 'received' check (status in ('received','processed','ignored','failed')),
 provider_reference text,
 failure_message text,
 received_at timestamptz not null default now(),
 processed_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(provider,provider_event_id)
);
create index if not exists saas_subscription_provider_events_org_received_idx on public.saas_subscription_provider_events(organization_id,received_at desc);
alter table public.saas_subscription_provider_events enable row level security;
revoke all on public.saas_subscription_provider_events from public,anon,authenticated;

create or replace function public.cpcm_service_claim_saas_provider_event(p_provider text,p_provider_event_id text,p_event_type text,p_organization_id uuid default null,p_provider_reference text default null)
returns table(event_id uuid,is_new boolean,status text)
language plpgsql security definer set search_path=''
as $$
declare eid uuid; inserted boolean:=false; p text:=lower(btrim(coalesce(p_provider,''))); peid text:=btrim(coalesce(p_provider_event_id,'')); et text:=btrim(coalesce(p_event_type,''));
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if p='' or peid='' or et='' then raise exception 'Provider, provider event id, and event type are required'; end if;
 if p_organization_id is not null and exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscription provider events'; end if;
 insert into public.saas_subscription_provider_events(provider,provider_event_id,organization_id,event_type,provider_reference)
 values(p,peid,p_organization_id,et,nullif(btrim(coalesce(p_provider_reference,'')),''))
 on conflict(provider,provider_event_id) do nothing returning id into eid;
 if eid is not null then inserted:=true; else select e.id into eid from public.saas_subscription_provider_events e where e.provider=p and e.provider_event_id=peid; end if;
 return query select e.id,inserted,e.status from public.saas_subscription_provider_events e where e.id=eid;
end $$;

create or replace function public.cpcm_service_finalize_saas_provider_event(p_event_id uuid,p_status text,p_failure_message text default null)
returns table(event_id uuid,status text,processed_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare st text:=lower(btrim(coalesce(p_status,'')));
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if st not in ('processed','ignored','failed') then raise exception 'Invalid provider event final status'; end if;
 update public.saas_subscription_provider_events e set status=st,failure_message=case when st='failed' then nullif(btrim(coalesce(p_failure_message,'')),'') else null end,processed_at=coalesce(e.processed_at,now()),updated_at=now() where e.id=p_event_id and e.status='received';
 if not found then raise exception 'Provider event is missing or already finalized'; end if;
 return query select e.id,e.status,e.processed_at from public.saas_subscription_provider_events e where e.id=p_event_id;
end $$;
revoke all on function public.cpcm_service_claim_saas_provider_event(text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_claim_saas_provider_event(text,text,text,uuid,text) to service_role;
revoke all on function public.cpcm_service_finalize_saas_provider_event(uuid,text,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_finalize_saas_provider_event(uuid,text,text) to service_role;
commit;
