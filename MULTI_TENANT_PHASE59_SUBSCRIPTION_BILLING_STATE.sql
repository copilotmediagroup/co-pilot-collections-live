-- Phase 59: subscription billing state for multi-tenant SaaS.
-- Gateway-neutral: payment provider/webhook can activate or suspend an organization without exposing secrets to the browser.
begin;

create table if not exists public.organization_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'standard',
  status text not null default 'pending_payment' check (status in ('pending_payment','active','past_due','cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_subscriptions enable row level security;

insert into public.organization_subscriptions(organization_id,plan,status,updated_at)
select o.id,coalesce(nullif(btrim(o.plan),''),'standard'),
       case when o.status='active' then 'active' when o.status='past_due' then 'past_due' when o.status='cancelled' then 'cancelled' else 'pending_payment' end,now()
from public.organizations o
where coalesce(o.is_demo,false)=false
on conflict(organization_id) do nothing;
revoke all on public.organization_subscriptions from anon,authenticated;

create or replace function public.cpcm_subscription_status()
returns table(organization_id uuid, plan text, subscription_status text, current_period_end timestamptz, cancel_at_period_end boolean)
language sql stable security definer set search_path=''
as $$
  select o.id,o.plan,coalesce(s.status,case when o.status in ('active','demo') then 'active' else 'pending_payment' end),s.current_period_end,coalesce(s.cancel_at_period_end,false)
  from public.organizations o
  left join public.organization_subscriptions s on s.organization_id=o.id
  where o.id=private.current_membership_organization_id()
  limit 1
$$;

revoke all on function public.cpcm_subscription_status() from public,anon;
grant execute on function public.cpcm_subscription_status() to authenticated;

create or replace function public.cpcm_platform_set_subscription_state(
 p_organization_id uuid,
 p_status text,
 p_plan text default null,
 p_provider text default null,
 p_provider_customer_id text default null,
 p_provider_subscription_id text default null,
 p_current_period_end timestamptz default null,
 p_cancel_at_period_end boolean default false
) returns text
language plpgsql security definer set search_path=''
as $$
declare clean_status text:=lower(coalesce(nullif(btrim(p_status),''),'pending_payment')); clean_plan text;
begin
 if not private.is_platform_admin() then raise exception 'Platform admin required'; end if;
 if clean_status not in ('pending_payment','active','past_due','cancelled') then raise exception 'Invalid subscription status'; end if;
 select coalesce(nullif(btrim(p_plan),''),o.plan,'standard') into clean_plan from public.organizations o where o.id=p_organization_id;
 if clean_plan is null then raise exception 'Organization not found'; end if;
 insert into public.organization_subscriptions(organization_id,plan,status,provider,provider_customer_id,provider_subscription_id,current_period_end,cancel_at_period_end,updated_at)
 values(p_organization_id,clean_plan,clean_status,nullif(btrim(p_provider),''),nullif(btrim(p_provider_customer_id),''),nullif(btrim(p_provider_subscription_id),''),p_current_period_end,coalesce(p_cancel_at_period_end,false),now())
 on conflict(organization_id) do update set plan=excluded.plan,status=excluded.status,provider=coalesce(excluded.provider,public.organization_subscriptions.provider),provider_customer_id=coalesce(excluded.provider_customer_id,public.organization_subscriptions.provider_customer_id),provider_subscription_id=coalesce(excluded.provider_subscription_id,public.organization_subscriptions.provider_subscription_id),current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now();
 update public.organizations set plan=clean_plan,status=case clean_status when 'active' then 'active' when 'past_due' then 'past_due' when 'cancelled' then 'cancelled' else 'pending_payment' end,updated_at=now() where id=p_organization_id and coalesce(is_demo,false)=false;
 return clean_status;
end
$$;

revoke all on function public.cpcm_platform_set_subscription_state(uuid,text,text,text,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.cpcm_platform_set_subscription_state(uuid,text,text,text,text,text,timestamptz,boolean) to authenticated;

commit;
