-- Phase 64: server-side SaaS checkout audit trail.
-- Records only plan/price intent; never card data. Amount is copied from the canonical plan catalog.
begin;
create table if not exists public.subscription_checkout_attempts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 plan_code text not null,
 billing_interval text not null check (billing_interval in ('monthly','annual')),
 amount_cents integer not null check (amount_cents > 0),
 status text not null default 'prepared' check (status in ('prepared','submitted','paid','failed','cancelled')),
 provider text,
 provider_reference text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.subscription_checkout_attempts enable row level security;
revoke all on public.subscription_checkout_attempts from public,anon,authenticated;

create or replace function public.cpcm_prepare_subscription_checkout()
returns table(checkout_id uuid,organization_id uuid,organization_name text,plan_code text,plan_name text,billing_interval text,amount_cents integer,subscription_status text)
language plpgsql security definer set search_path=''
as $$
declare uid uuid:=(select auth.uid()); oid uuid; member_role text; selected_plan text; selected_interval text; selected_status text; price_cents integer; plan_label text; checkout uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(m.role) into oid,member_role
 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.auth_user_id=uid and m.is_active=true and coalesce(o.is_demo,false)=false
 order by m.created_at asc limit 1;
 if oid is null then raise exception 'Production agency membership required'; end if;
 if member_role not in ('agency_admin','admin') then raise exception 'Agency administrator required'; end if;
 select s.plan,s.billing_interval,s.status into selected_plan,selected_interval,selected_status from public.organization_subscriptions s where s.organization_id=oid;
 if selected_plan is null or selected_interval not in ('monthly','annual') then raise exception 'Choose a subscription plan first'; end if;
 select p.display_name,case selected_interval when 'annual' then p.annual_price_cents else p.monthly_price_cents end into plan_label,price_cents from public.saas_plan_catalog p where p.plan_code=selected_plan and p.is_active=true;
 if price_cents is null then raise exception 'Selected subscription plan is unavailable'; end if;
 insert into public.subscription_checkout_attempts(organization_id,auth_user_id,plan_code,billing_interval,amount_cents,status,provider)
 values(oid,uid,selected_plan,selected_interval,price_cents,'prepared','nmi_easy_pay_direct') returning id into checkout;
 return query select checkout,o.id,o.name,selected_plan,plan_label,selected_interval,price_cents,coalesce(selected_status,'pending_payment') from public.organizations o where o.id=oid;
end
$$;
revoke all on function public.cpcm_prepare_subscription_checkout() from public,anon;
grant execute on function public.cpcm_prepare_subscription_checkout() to authenticated;
commit;
