-- Phase 76: browser-visible plan-change request workflow without provider mutation authority.
begin;

create or replace function public.cpcm_my_pending_subscription_plan_change()
returns table(request_id uuid,current_plan text,requested_plan text,requested_billing_interval text,change_kind text,amount_cents integer,status text,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 return query select r.id,r.current_plan,r.requested_plan,r.requested_billing_interval,r.change_kind,r.amount_cents,r.status,r.created_at
 from public.subscription_plan_change_requests r where r.organization_id=org and r.status in ('requested','provider_pending') order by r.created_at desc limit 1;
end $$;

create or replace function public.cpcm_cancel_subscription_plan_change_request(p_request_id uuid)
returns table(request_id uuid,status text)
language plpgsql security definer set search_path=''
as $$
declare org uuid; role_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select m.organization_id,lower(coalesce(m.role,'')) into org,role_name from public.organization_members m where m.user_id=auth.uid() and m.status='active' limit 1;
 if org is null or role_name not in ('agency_admin','admin') then raise exception 'Agency admin required'; end if;
 update public.subscription_plan_change_requests r set status='cancelled',completed_at=now(),updated_at=now()
 where r.id=p_request_id and r.organization_id=org and r.status='requested';
 if not found then raise exception 'Plan change request is not cancellable'; end if;
 return query select r.id,r.status from public.subscription_plan_change_requests r where r.id=p_request_id;
end $$;

revoke all on function public.cpcm_my_pending_subscription_plan_change() from public,anon;
grant execute on function public.cpcm_my_pending_subscription_plan_change() to authenticated;
revoke all on function public.cpcm_cancel_subscription_plan_change_request(uuid) from public,anon;
grant execute on function public.cpcm_cancel_subscription_plan_change_request(uuid) to authenticated;
commit;
