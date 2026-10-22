-- Phase 80: non-sensitive SaaS subscription payment-method metadata.
-- Raw PAN/CVV and gateway vault tokens are intentionally never stored here.
begin;
create table if not exists public.saas_subscription_payment_methods (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 provider text not null,
 provider_customer_id text,
 brand text,
 last4 text,
 exp_month integer,
 exp_year integer,
 status text not null default 'active' check (status in ('active','expired','removed','unknown')),
 updated_at timestamptz not null default now(),
 check (last4 is null or last4 ~ '^[0-9]{4}$'),
 check (exp_month is null or exp_month between 1 and 12)
);
alter table public.saas_subscription_payment_methods enable row level security;
revoke all on public.saas_subscription_payment_methods from public,anon,authenticated;

create or replace function public.cpcm_service_upsert_saas_payment_method(p_organization_id uuid,p_provider text,p_provider_customer_id text default null,p_brand text default null,p_last4 text default null,p_exp_month integer default null,p_exp_year integer default null,p_status text default 'active')
returns table(organization_id uuid,provider text,brand text,last4 text,exp_month integer,exp_year integer,status text)
language plpgsql security definer set search_path=''
as $$
declare st text:=lower(btrim(coalesce(p_status,'active'))); l4 text:=nullif(btrim(coalesce(p_last4,'')),'');
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 if exists(select 1 from public.organizations o where o.id=p_organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscription payment methods'; end if;
 if st not in ('active','expired','removed','unknown') then raise exception 'Invalid payment method status'; end if;
 if l4 is not null and l4 !~ '^[0-9]{4}$' then raise exception 'Only the final four card digits may be stored'; end if;
 insert into public.saas_subscription_payment_methods(organization_id,provider,provider_customer_id,brand,last4,exp_month,exp_year,status,updated_at)
 values(p_organization_id,lower(btrim(p_provider)),nullif(btrim(coalesce(p_provider_customer_id,'')),''),nullif(btrim(coalesce(p_brand,'')),''),l4,p_exp_month,p_exp_year,st,now())
 on conflict(organization_id) do update set provider=excluded.provider,provider_customer_id=coalesce(excluded.provider_customer_id,public.saas_subscription_payment_methods.provider_customer_id),brand=excluded.brand,last4=excluded.last4,exp_month=excluded.exp_month,exp_year=excluded.exp_year,status=excluded.status,updated_at=now();
 return query select m.organization_id,m.provider,m.brand,m.last4,m.exp_month,m.exp_year,m.status from public.saas_subscription_payment_methods m where m.organization_id=p_organization_id;
end $$;

create or replace function public.cpcm_my_saas_payment_method()
returns table(provider text,brand text,last4 text,exp_month integer,exp_year integer,status text,updated_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 return query select p.provider,p.brand,p.last4,p.exp_month,p.exp_year,p.status,p.updated_at from public.saas_subscription_payment_methods p join public.organizations o on o.id=p.organization_id where p.organization_id=org and coalesce(o.is_demo,false)=false;
end $$;
revoke all on function public.cpcm_service_upsert_saas_payment_method(uuid,text,text,text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.cpcm_service_upsert_saas_payment_method(uuid,text,text,text,text,integer,integer,text) to service_role;
revoke all on function public.cpcm_my_saas_payment_method() from public,anon;
grant execute on function public.cpcm_my_saas_payment_method() to authenticated;
commit;
