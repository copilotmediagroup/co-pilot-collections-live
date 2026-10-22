-- Phase 70: authenticated agency subscription management surface.
begin;
create or replace function public.cpcm_subscription_management()
returns table(organization_id uuid,organization_name text,plan_code text,plan_name text,status text,billing_interval text,current_period_end timestamptz,cancel_at_period_end boolean,included_users integer,included_accounts integer,active_users bigint,account_count bigint)
language plpgsql security definer set search_path=''
as $$
declare org uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id into org from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null then raise exception 'Organization membership required'; end if;
 return query select o.id,o.name,s.plan,p.display_name,s.status,s.billing_interval,s.current_period_end,coalesce(s.cancel_at_period_end,false),p.included_users,p.included_accounts,
 (select count(*) from public.organization_members m2 where m2.organization_id=o.id and m2.status='active'),
 (select count(*) from public.accounts a where a.organization_id=o.id)
 from public.organizations o join public.organization_subscriptions s on s.organization_id=o.id join public.saas_plan_catalog p on p.plan_code=s.plan
 where o.id=org and coalesce(o.is_demo,false)=false;
end $$;
revoke all on function public.cpcm_subscription_management() from public,anon;
grant execute on function public.cpcm_subscription_management() to authenticated;

create or replace function public.cpcm_request_subscription_cancellation()
returns table(organization_id uuid,status text,cancel_at_period_end boolean,current_period_end timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 if exists(select 1 from public.organizations o where o.id=org and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have subscriptions'; end if;
 update public.organization_subscriptions s set cancel_at_period_end=true,updated_at=now() where s.organization_id=org and s.status in ('active','past_due');
 if not found then raise exception 'No cancellable subscription found'; end if;
 return query select s.organization_id,s.status,s.cancel_at_period_end,s.current_period_end from public.organization_subscriptions s where s.organization_id=org;
end $$;
revoke all on function public.cpcm_request_subscription_cancellation() from public,anon;
grant execute on function public.cpcm_request_subscription_cancellation() to authenticated;

create or replace function public.cpcm_resume_subscription_renewal()
returns table(organization_id uuid,status text,cancel_at_period_end boolean,current_period_end timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 update public.organization_subscriptions s set cancel_at_period_end=false,updated_at=now() where s.organization_id=org and s.status='active';
 if not found then raise exception 'No active subscription found'; end if;
 return query select s.organization_id,s.status,s.cancel_at_period_end,s.current_period_end from public.organization_subscriptions s where s.organization_id=org;
end $$;
revoke all on function public.cpcm_resume_subscription_renewal() from public,anon;
grant execute on function public.cpcm_resume_subscription_renewal() to authenticated;
commit;
