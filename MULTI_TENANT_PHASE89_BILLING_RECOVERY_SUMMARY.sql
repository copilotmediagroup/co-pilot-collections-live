-- Phase 89: safe agency-admin billing recovery summary for past-due subscription UX.
-- Informational only: no browser mutation and no invented payment-provider recovery action.
begin;
create or replace function public.cpcm_my_billing_recovery_summary()
returns table(
 organization_id uuid,organization_name text,plan_code text,plan_name text,
 subscription_status text,billing_interval text,current_period_end timestamptz,
 past_due_since timestamptz,grace_period_ends_at timestamptz,cancel_at_period_end boolean,
 payment_method_brand text,payment_method_last4 text,payment_method_exp_month integer,
 payment_method_exp_year integer,payment_method_status text
)
language plpgsql stable security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name
 from public.organization_members m
 where m.auth_user_id=auth.uid() and m.is_active=true
 order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 return query
 select o.id,o.name,s.plan,p.display_name,s.status,s.billing_interval,s.current_period_end,
        s.past_due_since,s.grace_period_ends_at,coalesce(s.cancel_at_period_end,false),
        pm.brand,pm.last4,pm.exp_month,pm.exp_year,pm.status
 from public.organizations o
 join public.organization_subscriptions s on s.organization_id=o.id
 join public.saas_plan_catalog p on p.plan_code=s.plan
 left join public.saas_subscription_payment_methods pm on pm.organization_id=o.id
 where o.id=org and coalesce(o.is_demo,false)=false and s.status='past_due';
end $$;
revoke all on function public.cpcm_my_billing_recovery_summary() from public,anon;
grant execute on function public.cpcm_my_billing_recovery_summary() to authenticated;
commit;
