-- Phase 67: authenticated membership-safe access state for billing/lifecycle UX.
-- This does not grant tenant data access. It only explains why the current membership is gated.
begin;
create or replace function public.cpcm_my_organization_access_state()
returns table(organization_id uuid,organization_name text,organization_status text,member_role text,plan text,subscription_status text,billing_interval text,current_period_end timestamptz,cancel_at_period_end boolean)
language sql stable security definer set search_path=''
as $$
 select o.id,o.name,o.status,lower(m.role),o.plan,
        coalesce(s.status,case when o.status in ('active','demo') then 'active' when o.status='past_due' then 'past_due' when o.status='cancelled' then 'cancelled' else 'pending_payment' end),
        s.billing_interval,s.current_period_end,coalesce(s.cancel_at_period_end,false)
 from public.organization_members m
 join public.organizations o on o.id=m.organization_id
 left join public.organization_subscriptions s on s.organization_id=o.id
 where m.auth_user_id=(select auth.uid()) and m.is_active=true
 order by m.created_at asc limit 1
$$;
revoke all on function public.cpcm_my_organization_access_state() from public,anon;
grant execute on function public.cpcm_my_organization_access_state() to authenticated;
commit;
