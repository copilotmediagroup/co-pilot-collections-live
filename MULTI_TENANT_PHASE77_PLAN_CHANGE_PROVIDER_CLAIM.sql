-- Phase 77: service-only provider claim for durable plan-change requests.
begin;

alter table public.subscription_plan_change_requests add column if not exists provider_submitted_at timestamptz;

create or replace function public.cpcm_service_claim_subscription_plan_change(p_request_id uuid)
returns table(request_id uuid,organization_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer,status text)
language plpgsql security definer set search_path=''
as $$
declare r public.subscription_plan_change_requests%rowtype; sub public.organization_subscriptions%rowtype;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service role required'; end if;
 select * into r from public.subscription_plan_change_requests where id=p_request_id for update;
 if not found then raise exception 'Plan change request not found'; end if;
 if r.status <> 'requested' then raise exception 'Plan change request is not claimable'; end if;
 if exists(select 1 from public.organizations o where o.id=r.organization_id and coalesce(o.is_demo,false)) then raise exception 'Demo organizations do not have production subscriptions'; end if;
 select * into sub from public.organization_subscriptions s where s.organization_id=r.organization_id for update;
 if not found or sub.status not in ('active','past_due') then raise exception 'Active subscription not found'; end if;
 if sub.plan is distinct from r.current_plan then raise exception 'Subscription plan changed after request creation'; end if;
 update public.subscription_plan_change_requests set status='provider_pending',provider_submitted_at=coalesce(provider_submitted_at,now()),updated_at=now() where id=r.id;
 return query select r.id,r.organization_id,r.current_plan,r.requested_plan,r.requested_billing_interval,r.change_kind,r.amount_cents,'provider_pending'::text;
end $$;

revoke all on function public.cpcm_service_claim_subscription_plan_change(uuid) from public,anon,authenticated;
grant execute on function public.cpcm_service_claim_subscription_plan_change(uuid) to service_role;
commit;
