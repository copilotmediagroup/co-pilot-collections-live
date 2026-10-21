-- Phase 56: route payment-plan and settlement destructive browser actions through tenant-admin RPCs.
begin;
create or replace function public.cpcm_admin_delete_payment_plan(target_plan_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); aid uuid; n int:=0;
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 select account_id into aid from public.payment_plans where organization_id=oid and id=target_plan_id for update;
 if aid is null then raise exception 'payment plan not found in current organization'; end if;
 delete from public.payment_plan_payments where organization_id=oid and (plan_id=target_plan_id or payment_plan_id=target_plan_id); get diagnostics n=row_count;
 delete from public.payment_plans where organization_id=oid and id=target_plan_id;
 if not found then raise exception 'payment plan delete failed'; end if;
 return jsonb_build_object('ok',true,'plan_id',target_plan_id,'account_id',aid,'schedule_rows_deleted',n);
end $$;
create or replace function public.cpcm_admin_delete_settlement(target_settlement_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); aid uuid;
begin
 if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 delete from public.settlements where organization_id=oid and id=target_settlement_id returning account_id into aid;
 if aid is null then raise exception 'settlement not found in current organization'; end if;
 return jsonb_build_object('ok',true,'settlement_id',target_settlement_id,'account_id',aid);
end $$;
revoke all on function public.cpcm_admin_delete_payment_plan(uuid) from public,anon;
grant execute on function public.cpcm_admin_delete_payment_plan(uuid) to authenticated;
revoke all on function public.cpcm_admin_delete_settlement(uuid) from public,anon;
grant execute on function public.cpcm_admin_delete_settlement(uuid) to authenticated;
commit;
