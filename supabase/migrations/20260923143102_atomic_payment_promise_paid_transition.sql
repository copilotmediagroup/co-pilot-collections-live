create unique index if not exists payments_ledger_receipt_number_unique_idx
on public.payments_ledger (receipt_number)
where receipt_number is not null and btrim(receipt_number) <> '';

create or replace function public.cpcm_mark_payment_promise_paid(target_promise_id uuid, actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p public.payment_promises%rowtype; a public.accounts%rowtype; amt numeric; before_bal numeric; after_bal numeric; receipt text; ledger_id uuid;
begin
 select * into p from public.payment_promises where id=target_promise_id for update;
 if not found then raise exception 'Payment promise not found'; end if;
 if lower(coalesce(p.status,''))='paid' then select id into ledger_id from public.payments_ledger where receipt_number='PTP-'||target_promise_id::text limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 if p.account_id is null then raise exception 'Payment promise has no account'; end if;
 select * into a from public.accounts where id=p.account_id for update;
 if not found then raise exception 'Account not found'; end if;
 amt:=greatest(coalesce(p.payment_amount,0),0); if amt<=0 then raise exception 'Payment amount must be greater than zero'; end if;
 before_bal:=greatest(coalesce(a.current_balance,0),0); after_bal:=greatest(before_bal-amt,0); receipt:='PTP-'||target_promise_id::text;
 insert into public.payments_ledger(account_id,amount,payment_amount,payment_date,paid_at,payment_method,status,notes,created_by_email,payment_type,receipt_number,balance_before,balance_after,idempotency_key)
 values(p.account_id,amt,amt,current_date,now(),coalesce(p.payment_method,'Other'),'Completed','Admin marked payment promise paid. '||coalesce(p.notes,''),coalesce(actor_email,p.processed_by_email,p.employee_email,'system'),'Payment',receipt,before_bal,after_bal,receipt)
 on conflict (receipt_number) where receipt_number is not null and btrim(receipt_number)<>'' do nothing returning id into ledger_id;
 if ledger_id is null then select id into ledger_id from public.payments_ledger where receipt_number=receipt limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 update public.accounts set current_balance=after_bal,status=case when after_bal<=0 then 'Settled' else status end,disposition=case when after_bal<=0 then 'Settled' else disposition end,updated_at=now() where id=p.account_id;
 update public.payment_promises set status='Paid',paid_amount=amt,paid_date=current_date,processed_by_email=coalesce(actor_email,processed_by_email),processed_at=now(),updated_at=now() where id=target_promise_id;
 return jsonb_build_object('ok',true,'already_paid',false,'ledger_id',ledger_id,'account_id',p.account_id,'amount',amt,'balance_before',before_bal,'balance_after',after_bal);
end; $$;
