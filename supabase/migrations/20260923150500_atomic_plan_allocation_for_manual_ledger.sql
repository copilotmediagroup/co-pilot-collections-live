create or replace function public.cpcm_apply_payment_to_plan(target_account_id uuid, payment_amount numeric)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare pl public.payment_plans%rowtype; p public.payment_plan_payments%rowtype; amt numeric; left_amt numeric; due_left numeric; applied_amt numeric; new_paid numeric; total_applied numeric:=0; new_remaining numeric; applied jsonb:='[]'::jsonb;
begin
 amt:=greatest(coalesce(payment_amount,0),0); if amt<=0 then return jsonb_build_object('ok',true,'applied',applied,'total_applied',0); end if;
 select * into pl from public.payment_plans where account_id=target_account_id and lower(coalesce(status,'')) not in ('paid','cancelled') order by created_at desc limit 1 for update;
 if not found then return jsonb_build_object('ok',true,'applied',applied,'total_applied',0); end if; left_amt:=amt;
 for p in select * from public.payment_plan_payments where account_id=target_account_id and coalesce(plan_id,payment_plan_id)=pl.id and lower(coalesce(status,'')) not in ('paid','cancelled') order by coalesce(due_date,scheduled_date,payment_date),created_at for update loop
  exit when left_amt<=0; due_left:=greatest(coalesce(p.amount_due,p.payment_amount,p.amount,0)-coalesce(p.amount_paid,0),0); if due_left<=0 then continue; end if; applied_amt:=least(due_left,left_amt); new_paid:=round((coalesce(p.amount_paid,0)+applied_amt)::numeric,2);
  update public.payment_plan_payments set amount_paid=new_paid,paid_date=case when new_paid+0.01>=coalesce(amount_due,payment_amount,amount,0) then current_date else paid_date end,status=case when new_paid+0.01>=coalesce(amount_due,payment_amount,amount,0) then 'Paid' else 'Partial' end,updated_at=now() where id=p.id;
  left_amt:=round((left_amt-applied_amt)::numeric,2); total_applied:=total_applied+applied_amt; applied:=applied||jsonb_build_array(jsonb_build_object('paymentId',p.id,'applied',applied_amt,'status',case when new_paid+0.01>=coalesce(p.amount_due,p.payment_amount,p.amount,0) then 'Paid' else 'Partial' end));
 end loop;
 if total_applied>0 then new_remaining:=greatest(coalesce(pl.remaining_amount,pl.total_amount,pl.balance,0)-total_applied,0); update public.payment_plans set remaining_amount=new_remaining,status=case when new_remaining<=0 then 'Paid' else 'Active' end,updated_at=now() where id=pl.id; end if;
 return jsonb_build_object('ok',true,'plan_id',pl.id,'applied',applied,'total_applied',total_applied);
end; $$;
