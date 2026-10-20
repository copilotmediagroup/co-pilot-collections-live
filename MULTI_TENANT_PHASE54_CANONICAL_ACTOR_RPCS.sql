-- Phase 54: canonicalize authenticated actor identity in commission and call-attempt RPCs.
begin;
create or replace function public.cpcm_my_commission_summary()
returns jsonb language sql stable security invoker set search_path='' as $$
 with me as(select public.current_app_email() email,private.current_organization_id() oid),
 e as(select x.* from public.employee_commission_earnings x,me where x.organization_id=me.oid and lower(x.employee_email)=me.email and x.status='Earned'),
 rate as(select u.commission_rate from public.app_users u,me where u.organization_id=me.oid and lower(u.email)=me.email limit 1)
 select jsonb_build_object('commission_rate',coalesce((select commission_rate from rate),0),'today',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('day',now())),0),'week',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('week',now())),0),'month',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('month',now())),0),'year',coalesce((select sum(earned_amount) from e where approved_at>=date_trunc('year',now())),0),'gross_month',coalesce((select sum(gross_amount) from e where approved_at>=date_trunc('month',now())),0),'deal_count_month',(select count(*) from e where approved_at>=date_trunc('month',now())),'recent',coalesce((select jsonb_agg(jsonb_build_object('approved_at',approved_at,'gross_amount',gross_amount,'commission_rate',commission_rate,'earned_amount',earned_amount,'ledger_id',ledger_id) order by approved_at desc) from(select * from e order by approved_at desc limit 100)q),'[]'::jsonb));
$$;
revoke all on function public.cpcm_my_commission_summary() from public,anon;
grant execute on function public.cpcm_my_commission_summary() to authenticated;
commit;
