-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 20
-- Tenant-bind payment promise creation and paid transition. SECURITY INVOKER + RLS remain active.

-- Global receipt strings remain UUID-derived and globally safe. Promise group identifiers are tenant-scoped.
drop index if exists public.payment_promises_group_schedule_unique_idx;
create unique index if not exists payment_promises_org_group_schedule_unique_idx
on public.payment_promises(organization_id,promise_group_id,schedule_index)
where promise_group_id is not null and btrim(promise_group_id)<>'';

create or replace function public.cpcm_create_payment_promises(target_account_id uuid,promise_group text,promises jsonb,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.assert_account_in_current_organization(target_account_id); a public.accounts%rowtype; item jsonb; inserted_count integer:=0; expected_count integer; idx integer; amt numeric; due date;
begin
 select * into a from public.accounts where organization_id=oid and id=target_account_id for update;
 if not found then raise exception 'Account not found'; end if;
 if promise_group is null or btrim(promise_group)='' then raise exception 'Promise group required'; end if;
 if promises is null or jsonb_typeof(promises)<>'array' or jsonb_array_length(promises)=0 then raise exception 'Promise schedule required'; end if;
 expected_count:=jsonb_array_length(promises);
 for item in select * from jsonb_array_elements(promises) loop
  idx:=coalesce((item->>'schedule_index')::integer,0); amt:=coalesce((item->>'payment_amount')::numeric,0); due:=(item->>'due_date')::date;
  if idx<1 or amt<=0 or due is null then raise exception 'Invalid promise schedule item'; end if;
  insert into public.payment_promises(organization_id,account_id,promise_group_id,schedule_index,schedule_total,debtor_name,account_number,payment_kind,payment_amount,total_amount,due_date,payment_method,method_last4,authorization_method,status,employee_email,assigned_to_email,notes,created_by_email,updated_at)
  values(oid,target_account_id,promise_group,idx,expected_count,item->>'debtor_name',item->>'account_number',item->>'payment_kind',amt,coalesce((item->>'total_amount')::numeric,amt*expected_count),due,item->>'payment_method',nullif(item->>'method_last4',''),item->>'authorization_method',coalesce(nullif(item->>'status',''),'Pending Processing'),coalesce(item->>'employee_email',actor_email),item->>'assigned_to_email',item->>'notes',coalesce(actor_email,item->>'created_by_email','system'),now())
  on conflict (organization_id,promise_group_id,schedule_index) where promise_group_id is not null and btrim(promise_group_id)<>'' do nothing;
  if found then inserted_count:=inserted_count+1; end if;
 end loop;
 if inserted_count not in (0,expected_count) then raise exception 'Partial promise group detected'; end if;
 if inserted_count=expected_count then update public.accounts set status='Promise to Pay',disposition='Promise to Pay',updated_at=now() where organization_id=oid and id=target_account_id; end if;
 return jsonb_build_object('ok',true,'created_count',inserted_count,'already_exists',inserted_count=0,'promise_group_id',promise_group);
end; $$;

create or replace function public.cpcm_mark_payment_promise_paid(target_promise_id uuid,actor_email text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p public.payment_promises%rowtype; a public.accounts%rowtype; oid uuid:=private.current_organization_id(); amt numeric; before_bal numeric; after_bal numeric; receipt text; ledger_id uuid;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_promises where organization_id=oid and id=target_promise_id for update;
 if not found then raise exception 'Payment promise not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if lower(coalesce(p.status,''))='paid' then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number='PTP-'||target_promise_id::text limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 if p.account_id is null then raise exception 'Payment promise has no account'; end if;
 select * into a from public.accounts where organization_id=oid and id=p.account_id for update;
 if not found then raise exception 'Account not found'; end if;
 amt:=greatest(coalesce(p.payment_amount,0),0); if amt<=0 then raise exception 'Payment amount must be greater than zero'; end if;
 before_bal:=greatest(coalesce(a.current_balance,0),0); after_bal:=greatest(before_bal-amt,0); receipt:='PTP-'||target_promise_id::text;
 insert into public.payments_ledger(organization_id,account_id,amount,payment_amount,payment_date,paid_at,payment_method,status,notes,created_by_email,payment_type,receipt_number,balance_before,balance_after,idempotency_key)
 values(oid,p.account_id,amt,amt,current_date,now(),coalesce(p.payment_method,'Other'),'Completed','Admin marked payment promise paid. '||coalesce(p.notes,''),coalesce(actor_email,p.processed_by_email,p.employee_email,'system'),'Payment',receipt,before_bal,after_bal,receipt)
 on conflict (receipt_number) where receipt_number is not null and btrim(receipt_number)<>'' do nothing returning id into ledger_id;
 if ledger_id is null then select id into ledger_id from public.payments_ledger where organization_id=oid and receipt_number=receipt limit 1; return jsonb_build_object('ok',true,'already_paid',true,'ledger_id',ledger_id,'account_id',p.account_id); end if;
 update public.accounts set current_balance=after_bal,status=case when after_bal<=0 then 'Settled' else status end,disposition=case when after_bal<=0 then 'Settled' else disposition end,updated_at=now() where organization_id=oid and id=p.account_id;
 update public.payment_promises set status='Paid',paid_amount=amt,paid_date=current_date,processed_by_email=coalesce(actor_email,processed_by_email),processed_at=now(),updated_at=now() where organization_id=oid and id=target_promise_id;
 return jsonb_build_object('ok',true,'already_paid',false,'ledger_id',ledger_id,'account_id',p.account_id,'amount',amt,'balance_before',before_bal,'balance_after',after_bal);
end; $$;

-- Broken-promise uniqueness must also be tenant-aware because source identifiers may repeat across agencies.
drop index if exists public.collector_alerts_source_open_unique_idx;
create unique index if not exists collector_alerts_org_source_open_unique_idx on public.collector_alerts(organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'';
drop index if exists public.follow_ups_broken_source_unique_idx;
create unique index if not exists follow_ups_org_broken_source_unique_idx on public.follow_ups(organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up';

create or replace function public.cpcm_flag_broken_plan_payment(target_payment_id uuid,actor_email text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); p public.payment_plan_payments%rowtype; aid uuid; pid uuid; assignee text;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_plan_payments where organization_id=oid and id=target_payment_id for update; if not found then raise exception 'Scheduled payment not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if coalesce(p.due_date,p.scheduled_date,p.payment_date)>=current_date or lower(coalesce(p.status,'')) in ('paid','cancelled') or coalesce(p.amount_paid,0)>=coalesce(p.amount_due,p.payment_amount,p.amount,0) then return jsonb_build_object('ok',true,'flagged',false); end if;
 aid:=p.account_id; pid:=coalesce(p.plan_id,p.payment_plan_id);
 update public.payment_plan_payments set status='Broken Promise',updated_at=now() where organization_id=oid and id=p.id;
 if pid is not null then update public.payment_plans set status='Broken Promise',updated_at=now() where organization_id=oid and id=pid; end if;
 update public.accounts set status='Broken Promise',disposition='Broken Promise',updated_at=now() where organization_id=oid and id=aid returning assigned_to_email into assignee;
 insert into public.follow_ups(organization_id,account_id,follow_up_type,due_date,status,assigned_to_email,reason,notes,created_by_email) values(oid,aid,'Broken Promise Follow-Up',current_date,'Open',coalesce(assignee,actor_email,''),'Missed payment promise','Automatically created from broken promise automation.',coalesce(actor_email,'system')) on conflict (organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up' do nothing;
 insert into public.collector_alerts(organization_id,account_id,alert_type,severity,title,message,due_date,status,assigned_to_email,created_by_email,source_table,source_id) values(oid,aid,'Broken Promise','critical','Broken payment plan promise','Missed scheduled payment requires follow-up.',current_date,'Open',coalesce(assignee,actor_email,''),coalesce(actor_email,'system'),'payment_plan_payments',p.id::text) on conflict (organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'' do nothing;
 return jsonb_build_object('ok',true,'flagged',true,'account_id',aid);
end; $$;

create or replace function public.cpcm_flag_broken_manual_promise(target_promise_id uuid,actor_email text default null) returns jsonb language plpgsql security invoker set search_path=public as $$
declare oid uuid:=private.current_organization_id(); p public.payment_promises%rowtype; assignee text; amt numeric;
begin
 if oid is null then raise exception 'No active organization'; end if;
 select * into p from public.payment_promises where organization_id=oid and id=target_promise_id for update; if not found then raise exception 'Payment promise not found'; end if;
 perform private.assert_account_in_current_organization(p.account_id);
 if p.due_date>=current_date or lower(coalesce(p.status,'')) in ('paid','completed','settled','canceled','cancelled','broken promise') or coalesce(p.paid_amount,0)>=coalesce(p.payment_amount,0) then return jsonb_build_object('ok',true,'flagged',false); end if;
 amt:=greatest(coalesce(p.payment_amount,0)-coalesce(p.paid_amount,0),0);
 update public.payment_promises set status='Broken Promise',admin_note='Auto-flagged missed payment promise due '||p.due_date::text||'.',processed_by_email=coalesce(actor_email,processed_by_email),processed_at=now(),updated_at=now() where organization_id=oid and id=p.id;
 update public.accounts set status='Broken Promise',disposition='Broken Promise',updated_at=now() where organization_id=oid and id=p.account_id returning assigned_to_email into assignee;
 insert into public.follow_ups(organization_id,account_id,follow_up_type,due_date,status,assigned_to_email,reason,notes,created_by_email) values(oid,p.account_id,'Broken Promise Follow-Up',current_date,'Open',coalesce(assignee,p.employee_email,actor_email,''),'Missed manual payment promise','Automatically created from Promise Automation.',coalesce(actor_email,'system')) on conflict (organization_id,account_id,follow_up_type,due_date) where status='Open' and follow_up_type='Broken Promise Follow-Up' do nothing;
 insert into public.collector_alerts(organization_id,account_id,alert_type,severity,title,message,due_date,status,assigned_to_email,created_by_email,source_table,source_id) values(oid,p.account_id,'Broken Promise','critical','Broken promise needs follow-up','Missed manual payment promise of '||amt::text||' requires follow-up.',current_date,'Open',coalesce(assignee,p.employee_email,actor_email,''),coalesce(actor_email,'system'),'payment_promises',p.id::text) on conflict (organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'' do nothing;
 return jsonb_build_object('ok',true,'flagged',true,'account_id',p.account_id,'amount',amt);
end; $$;
