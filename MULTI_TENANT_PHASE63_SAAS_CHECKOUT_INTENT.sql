-- Phase 63: trusted checkout intent for Co Pilot SaaS billing.
-- The browser chooses only plan + interval. Amount is always derived server-side from saas_plan_catalog.
begin;

alter table public.organization_subscriptions add column if not exists amount_cents integer;
alter table public.organization_subscriptions add column if not exists gateway_provider text;
alter table public.organization_subscriptions add column if not exists gateway_customer_id text;
alter table public.organization_subscriptions add column if not exists gateway_subscription_id text;
alter table public.organization_subscriptions add column if not exists current_period_start timestamptz;
alter table public.organization_subscriptions add column if not exists current_period_end timestamptz;
alter table public.organization_subscriptions add column if not exists last_payment_at timestamptz;
alter table public.organization_subscriptions add column if not exists next_payment_at timestamptz;
alter table public.organization_subscriptions add column if not exists cancel_at_period_end boolean not null default false;

create or replace function public.cpcm_my_subscription_checkout()
returns table(organization_id uuid,organization_name text,plan_code text,plan_name text,billing_interval text,amount_cents integer,subscription_status text)
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); oid uuid; member_role text; selected_plan text; selected_interval text; selected_status text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(m.role) into oid,member_role
 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.auth_user_id=uid and m.is_active=true and coalesce(o.is_demo,false)=false
 order by m.created_at asc limit 1;
 if oid is null then raise exception 'Production agency membership required'; end if;
 if member_role not in ('agency_admin','admin') then raise exception 'Agency administrator required'; end if;
 select s.plan,s.billing_interval,s.status into selected_plan,selected_interval,selected_status
 from public.organization_subscriptions s where s.organization_id=oid;
 if selected_plan is null or selected_interval not in ('monthly','annual') then raise exception 'Choose a subscription plan first'; end if;
 return query
 select o.id,o.name,p.plan_code,p.display_name,selected_interval,
        case selected_interval when 'annual' then p.annual_price_cents else p.monthly_price_cents end,
        coalesce(selected_status,'pending_payment')
 from public.organizations o join public.saas_plan_catalog p on p.plan_code=selected_plan and p.is_active=true
 where o.id=oid;
end
$$;
revoke all on function public.cpcm_my_subscription_checkout() from public,anon;
grant execute on function public.cpcm_my_subscription_checkout() to authenticated;

commit;
