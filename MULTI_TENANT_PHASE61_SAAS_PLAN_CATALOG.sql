-- Phase 61: canonical Co Pilot Collections SaaS plan catalog and tenant limits.
-- Prices are stored in cents. Annual pricing is the approved two-month-free structure.
begin;

create table if not exists public.saas_plan_catalog (
  plan_code text primary key,
  display_name text not null,
  monthly_price_cents integer not null check (monthly_price_cents > 0),
  annual_price_cents integer not null check (annual_price_cents > 0),
  included_users integer not null check (included_users > 0),
  included_accounts integer not null check (included_accounts > 0),
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.saas_plan_catalog(plan_code,display_name,monthly_price_cents,annual_price_cents,included_users,included_accounts,sort_order,is_active,updated_at)
values
 ('starter','Starter',29900,299000,5,5000,10,true,now()),
 ('professional','Professional',59900,599000,15,25000,20,true,now()),
 ('agency_pro','Agency Pro',99900,999000,40,100000,30,true,now())
on conflict(plan_code) do update set
 display_name=excluded.display_name,
 monthly_price_cents=excluded.monthly_price_cents,
 annual_price_cents=excluded.annual_price_cents,
 included_users=excluded.included_users,
 included_accounts=excluded.included_accounts,
 sort_order=excluded.sort_order,
 is_active=excluded.is_active,
 updated_at=now();

alter table public.saas_plan_catalog enable row level security;
revoke all on public.saas_plan_catalog from public,anon,authenticated;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='saas_plan_catalog' and policyname='authenticated_read_active_saas_plans') then
    create policy authenticated_read_active_saas_plans on public.saas_plan_catalog for select to authenticated using (is_active=true);
  end if;
end $$;
grant select on public.saas_plan_catalog to authenticated;

alter table public.organization_subscriptions add column if not exists billing_interval text;
alter table public.organization_subscriptions drop constraint if exists organization_subscriptions_billing_interval_check;
alter table public.organization_subscriptions add constraint organization_subscriptions_billing_interval_check check (billing_interval is null or billing_interval in ('monthly','annual'));

create or replace function public.cpcm_saas_plan_catalog()
returns table(plan_code text,display_name text,monthly_price_cents integer,annual_price_cents integer,included_users integer,included_accounts integer,sort_order integer)
language sql stable security definer set search_path=''
as $$
 select p.plan_code,p.display_name,p.monthly_price_cents,p.annual_price_cents,p.included_users,p.included_accounts,p.sort_order
 from public.saas_plan_catalog p where p.is_active=true order by p.sort_order,p.plan_code
$$;
revoke all on function public.cpcm_saas_plan_catalog() from public,anon;
grant execute on function public.cpcm_saas_plan_catalog() to authenticated;

commit;
