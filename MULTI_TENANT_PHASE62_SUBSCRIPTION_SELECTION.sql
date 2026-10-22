-- Phase 62: authenticated agency owner may choose a canonical plan and billing interval before payment.
-- This records intent only. It NEVER activates access; only trusted billing transitions may do that.
begin;

create or replace function public.cpcm_select_subscription_plan(p_plan_code text,p_billing_interval text)
returns table(organization_id uuid,plan_code text,billing_interval text,amount_cents integer,subscription_status text)
language plpgsql security definer set search_path=''
as $$
declare
 uid uuid:=(select auth.uid()); oid uuid; member_role text; clean_plan text:=lower(nullif(btrim(p_plan_code),'')); clean_interval text:=lower(nullif(btrim(p_billing_interval),'')); price_cents integer;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(m.role) into oid,member_role from public.organization_members m join public.organizations o on o.id=m.organization_id where m.auth_user_id=uid and m.is_active=true and coalesce(o.is_demo,false)=false order by m.created_at asc limit 1;
 if oid is null then raise exception 'Production agency membership required'; end if;
 if member_role not in ('agency_admin','admin') then raise exception 'Agency administrator required'; end if;
 if clean_interval not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 select case clean_interval when 'annual' then p.annual_price_cents else p.monthly_price_cents end into price_cents from public.saas_plan_catalog p where p.plan_code=clean_plan and p.is_active=true;
 if price_cents is null then raise exception 'Invalid subscription plan'; end if;
 insert into public.organization_subscriptions(organization_id,plan,status,billing_interval,updated_at)
 values(oid,clean_plan,'pending_payment',clean_interval,now())
 on conflict(organization_id) do update set plan=excluded.plan,status='pending_payment',billing_interval=excluded.billing_interval,updated_at=now();
 update public.organizations set plan=clean_plan,status='pending_payment',updated_at=now() where id=oid and status='pending_payment';
 return query select oid,clean_plan,clean_interval,price_cents,'pending_payment'::text;
end
$$;
revoke all on function public.cpcm_select_subscription_plan(text,text) from public,anon;
grant execute on function public.cpcm_select_subscription_plan(text,text) to authenticated;
commit;
