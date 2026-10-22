-- Phase 87: normalize subscription browser/admin membership resolution onto the canonical organization_members schema.
-- Canonical membership columns are auth_user_id + is_active; legacy user_id/status references are removed from subscription RPCs.
begin;

create or replace function public.cpcm_subscription_management()
returns table(organization_id uuid,organization_name text,plan_code text,plan_name text,status text,billing_interval text,current_period_end timestamptz,cancel_at_period_end boolean,included_users integer,included_accounts integer,active_users bigint,account_count bigint)
language plpgsql security definer set search_path=''
as $$
declare org uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id into org from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null then raise exception 'Organization membership required'; end if;
 return query select o.id,o.name,s.plan,p.display_name,s.status,s.billing_interval,s.current_period_end,coalesce(s.cancel_at_period_end,false),p.included_users,p.included_accounts,
 (select count(*) from public.organization_members m2 where m2.organization_id=o.id and m2.is_active=true),
 (select count(*) from public.accounts a where a.organization_id=o.id)
 from public.organizations o join public.organization_subscriptions s on s.organization_id=o.id join public.saas_plan_catalog p on p.plan_code=s.plan where o.id=org and coalesce(o.is_demo,false)=false;
end $$;

create or replace function public.cpcm_request_subscription_cancellation()
returns table(organization_id uuid,status text,cancel_at_period_end boolean,current_period_end timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency Admin required'; end if;
 if exists(select 1 from public.organizations o where o.id=org and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s set cancel_at_period_end=true,updated_at=now() where s.organization_id=org and s.status in ('active','past_due');
 if not found then raise exception 'Active subscription not found'; end if;
 return query select s.organization_id,s.status,s.cancel_at_period_end,s.current_period_end from public.organization_subscriptions s where s.organization_id=org;
end $$;

create or replace function public.cpcm_resume_subscription_renewal()
returns table(organization_id uuid,status text,cancel_at_period_end boolean,current_period_end timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency Admin required'; end if;
 if exists(select 1 from public.organizations o where o.id=org and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 update public.organization_subscriptions s set cancel_at_period_end=false,updated_at=now() where s.organization_id=org and s.status='active';
 if not found then raise exception 'Active subscription not found'; end if;
 return query select s.organization_id,s.status,s.cancel_at_period_end,s.current_period_end from public.organization_subscriptions s where s.organization_id=org;
end $$;

create or replace function public.cpcm_request_subscription_plan_change(p_plan_code text,p_billing_interval text)
returns table(organization_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer,current_users bigint,current_accounts bigint,included_users integer,included_accounts integer)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text; current_code text; current_interval text; target record; current_users bigint; current_accounts bigint; kind text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency Admin required'; end if;
 if exists(select 1 from public.organizations o where o.id=org and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 select s.plan,s.billing_interval into current_code,current_interval from public.organization_subscriptions s where s.organization_id=org and s.status in ('active','past_due');
 if not found then raise exception 'Active subscription not found'; end if;
 select p.plan_code,p.included_users,p.included_accounts,case when lower(p_billing_interval)='annual' then p.annual_price_cents else p.monthly_price_cents end as amount into target from public.saas_plan_catalog p where p.plan_code=lower(trim(p_plan_code)) and p.is_active=true;
 if not found then raise exception 'Requested plan is not available'; end if;
 if lower(trim(p_billing_interval)) not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 select count(*) into current_users from public.organization_members m where m.organization_id=org and m.is_active=true;
 select count(*) into current_accounts from public.accounts a where a.organization_id=org;
 if current_users>target.included_users then raise exception 'Requested plan cannot support current active users'; end if;
 if current_accounts>target.included_accounts then raise exception 'Requested plan cannot support current accounts'; end if;
 kind:=case when target.plan_code=current_code and lower(trim(p_billing_interval))=current_interval then 'no_change' when target.plan_code=current_code then 'billing_interval_change' when target.included_users>(select p2.included_users from public.saas_plan_catalog p2 where p2.plan_code=current_code) then 'upgrade' else 'downgrade' end;
 return query select org,current_code,target.plan_code,lower(trim(p_billing_interval)),kind,target.amount,current_users,current_accounts,target.included_users,target.included_accounts;
end $$;

create or replace function public.cpcm_my_pending_subscription_plan_change()
returns table(request_id uuid,organization_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer,status text,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency Admin required'; end if;
 return query select r.id,r.organization_id,r.current_plan,r.requested_plan,r.requested_billing_interval,r.change_kind,r.amount_cents,r.status,r.created_at from public.subscription_plan_change_requests r where r.organization_id=org and r.status in ('requested','provider_pending') order by r.created_at desc limit 1;
end $$;

create or replace function public.cpcm_cancel_subscription_plan_change_request(p_request_id uuid)
returns table(request_id uuid,status text)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.auth_user_id=auth.uid() and m.is_active=true order by m.created_at asc limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency Admin required'; end if;
 update public.subscription_plan_change_requests r set status='cancelled',completed_at=now(),updated_at=now() where r.id=p_request_id and r.organization_id=org and r.status='requested';
 if not found then raise exception 'Requested plan change not found or cannot be cancelled'; end if;
 return query select r.id,r.status from public.subscription_plan_change_requests r where r.id=p_request_id;
end $$;

-- Re-issue browser grants explicitly after replacement.
revoke all on function public.cpcm_subscription_management() from public,anon;
grant execute on function public.cpcm_subscription_management() to authenticated;
revoke all on function public.cpcm_request_subscription_cancellation() from public,anon;
grant execute on function public.cpcm_request_subscription_cancellation() to authenticated;
revoke all on function public.cpcm_resume_subscription_renewal() from public,anon;
grant execute on function public.cpcm_resume_subscription_renewal() to authenticated;
revoke all on function public.cpcm_request_subscription_plan_change(text,text) from public,anon;
grant execute on function public.cpcm_request_subscription_plan_change(text,text) to authenticated;
revoke all on function public.cpcm_my_pending_subscription_plan_change() from public,anon;
grant execute on function public.cpcm_my_pending_subscription_plan_change() to authenticated;
revoke all on function public.cpcm_cancel_subscription_plan_change_request(uuid) from public,anon;
grant execute on function public.cpcm_cancel_subscription_plan_change_request(uuid) to authenticated;
commit;
