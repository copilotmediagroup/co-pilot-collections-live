-- Phase 79: past-due agencies stay operationally gated but agency admins can inspect billing recovery state.
begin;
create or replace function public.cpcm_my_organization_access_state()
returns table(organization_id uuid,organization_name text,organization_status text,member_role text,plan text,subscription_status text,billing_interval text,current_period_end timestamptz,cancel_at_period_end boolean,grace_period_ends_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select o.id,o.name,o.status,lower(m.role),o.plan,
        coalesce(s.status,case when o.status in ('active','demo') then 'active' when o.status='past_due' then 'past_due' when o.status='cancelled' then 'cancelled' else 'pending_payment' end),
        s.billing_interval,s.current_period_end,coalesce(s.cancel_at_period_end,false),s.grace_period_ends_at
 from public.organization_members m
 join public.organizations o on o.id=m.organization_id
 left join public.organization_subscriptions s on s.organization_id=o.id
 where m.auth_user_id=(select auth.uid()) and m.is_active=true
 order by m.created_at asc limit 1
$$;
revoke all on function public.cpcm_my_organization_access_state() from public,anon;
grant execute on function public.cpcm_my_organization_access_state() to authenticated;

create or replace function public.cpcm_past_due_billing_recovery()
returns table(organization_id uuid,organization_name text,plan_code text,plan_name text,subscription_status text,billing_interval text,current_period_end timestamptz,past_due_since timestamptz,grace_period_ends_at timestamptz,cancel_at_period_end boolean)
language plpgsql stable security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name
 from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 return query
 select o.id,o.name,s.plan,p.display_name,s.status,s.billing_interval,s.current_period_end,s.past_due_since,s.grace_period_ends_at,coalesce(s.cancel_at_period_end,false)
 from public.organizations o
 join public.organization_subscriptions s on s.organization_id=o.id
 join public.saas_plan_catalog p on p.plan_code=s.plan
 where o.id=org and coalesce(o.is_demo,false)=false and s.status='past_due';
end $$;
revoke all on function public.cpcm_past_due_billing_recovery() from public,anon;
grant execute on function public.cpcm_past_due_billing_recovery() to authenticated;
commit;
