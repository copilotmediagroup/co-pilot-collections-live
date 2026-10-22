-- Phase 72: safe self-service subscription plan changes.
begin;
create or replace function public.cpcm_request_subscription_plan_change(p_plan_code text,p_billing_interval text)
returns table(organization_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text; current_code text; target_code text:=lower(trim(coalesce(p_plan_code,''))); interval_code text:=lower(trim(coalesce(p_billing_interval,''))); current_users bigint; current_accounts bigint; target_users integer; target_accounts integer; target_amount integer; current_rank integer; target_rank integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 if exists(select 1 from public.organizations o where o.id=org and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 if interval_code not in ('monthly','annual') then raise exception 'Invalid billing interval'; end if;
 select s.plan into current_code from public.organization_subscriptions s where s.organization_id=org and s.status in ('active','past_due');
 if current_code is null then raise exception 'Active subscription required'; end if;
 select p.included_users,p.included_accounts,case when interval_code='annual' then p.annual_price_cents else p.monthly_price_cents end into target_users,target_accounts,target_amount from public.saas_plan_catalog p where p.plan_code=target_code and p.is_active=true;
 if not found then raise exception 'Invalid subscription plan'; end if;
 select count(*) into current_users from public.organization_members m where m.organization_id=org and m.status='active';
 select count(*) into current_accounts from public.accounts a where a.organization_id=org;
 if current_users>target_users then raise exception 'Cannot change to this plan: active users exceed the target plan limit'; end if;
 if current_accounts>target_accounts then raise exception 'Cannot change to this plan: accounts exceed the target plan limit'; end if;
 current_rank:=case current_code when 'starter' then 1 when 'professional' then 2 when 'agency_pro' then 3 else 99 end;
 target_rank:=case target_code when 'starter' then 1 when 'professional' then 2 when 'agency_pro' then 3 else 99 end;
 return query select org,current_code,target_code,interval_code,case when target_rank>current_rank then 'upgrade' when target_rank<current_rank then 'downgrade' when interval_code<>(select s.billing_interval from public.organization_subscriptions s where s.organization_id=org) then 'billing_interval_change' else 'no_change' end,target_amount;
end $$;
revoke all on function public.cpcm_request_subscription_plan_change(text,text) from public,anon;
grant execute on function public.cpcm_request_subscription_plan_change(text,text) to authenticated;
commit;
