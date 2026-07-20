-- CO PILOT COLLECTIONS MANAGER - LIVE NMI PHASE 1 (R8N12)
-- One-time card sales, NMI refunds/voids, ledger/balance updates, audit trail,
-- payment-plan allocation, webhook reconciliation, and duplicate protection.
-- Run once in the LIVE Supabase SQL Editor after the prior LIVE migrations.

create extension if not exists pgcrypto;

begin;

-- Ensure the existing payment tables have the columns this integration uses.
alter table public.accounts
  add column if not exists current_balance numeric(14,2),
  add column if not exists status text,
  add column if not exists updated_at timestamptz default now();

alter table public.payments_ledger
  add column if not exists payment_date date,
  add column if not exists amount numeric(14,2),
  add column if not exists payment_type text default 'Payment',
  add column if not exists payment_method text default 'Other',
  add column if not exists processor_fee numeric(14,2) not null default 0,
  add column if not exists status text default 'Completed',
  add column if not exists receipt_number text,
  add column if not exists balance_before numeric(14,2),
  add column if not exists balance_after numeric(14,2),
  add column if not exists notes text,
  add column if not exists created_by_email text,
  add column if not exists plan_payment_id uuid,
  add column if not exists gateway_provider text,
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_parent_transaction_id text,
  add column if not exists gateway_status text,
  add column if not exists gateway_response jsonb not null default '{}'::jsonb,
  add column if not exists authorization_code text,
  add column if not exists card_brand text,
  add column if not exists card_last4 text,
  add column if not exists idempotency_key text,
  add column if not exists refunded_amount numeric(14,2) not null default 0,
  add column if not exists voided_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.payment_plans
  add column if not exists remaining_amount numeric(14,2) default 0,
  add column if not exists status text default 'Active',
  add column if not exists updated_at timestamptz default now();

alter table public.payment_plan_payments
  add column if not exists plan_id uuid,
  add column if not exists payment_plan_id uuid,
  add column if not exists amount numeric(14,2) default 0,
  add column if not exists payment_amount numeric(14,2) default 0,
  add column if not exists account_id uuid,
  add column if not exists due_date date,
  add column if not exists amount_due numeric(14,2) default 0,
  add column if not exists amount_paid numeric(14,2) default 0,
  add column if not exists paid_date date,
  add column if not exists status text default 'Scheduled',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists payments_ledger_nmi_idempotency_uq
  on public.payments_ledger(idempotency_key)
  where idempotency_key is not null;
create index if not exists payments_ledger_nmi_gateway_idx
  on public.payments_ledger(gateway_provider, gateway_transaction_id);

create table if not exists public.nmi_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete restrict,
  ledger_id uuid references public.payments_ledger(id) on delete set null,
  parent_ledger_id uuid references public.payments_ledger(id) on delete set null,
  action text not null check (action in ('sale','refund','void')),
  idempotency_key text not null unique,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  status text not null default 'pending',
  gateway_transaction_id text,
  parent_gateway_transaction_id text,
  response_code text,
  response_text text,
  authorization_code text,
  card_brand text,
  card_last4 text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_by_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nmi_transactions_account_idx
  on public.nmi_transactions(account_id, created_at desc);
create index if not exists nmi_transactions_gateway_idx
  on public.nmi_transactions(gateway_transaction_id);

create table if not exists public.nmi_plan_allocations (
  id uuid primary key default gen_random_uuid(),
  nmi_transaction_id uuid not null references public.nmi_transactions(id) on delete cascade,
  ledger_id uuid not null references public.payments_ledger(id) on delete cascade,
  payment_plan_id uuid references public.payment_plans(id) on delete set null,
  payment_plan_payment_id uuid references public.payment_plan_payments(id) on delete set null,
  applied_amount numeric(14,2) not null default 0,
  reversed_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nmi_plan_allocations_ledger_idx
  on public.nmi_plan_allocations(ledger_id, created_at desc);

create table if not exists public.nmi_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text,
  gateway_transaction_id text,
  signature_verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'received',
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Read access is limited. All writes occur through the protected Edge Functions.
alter table public.nmi_transactions enable row level security;
alter table public.nmi_plan_allocations enable row level security;
alter table public.nmi_webhook_events enable row level security;

drop policy if exists cpcm_nmi_transactions_select on public.nmi_transactions;
create policy cpcm_nmi_transactions_select on public.nmi_transactions
for select to authenticated using (
  lower(created_by_email)=lower(coalesce(auth.jwt()->>'email',''))
  or exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='admin'
      and coalesce(u.is_approved,true)=true
      and coalesce(u.is_active,true)=true
  )
  or lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
);

drop policy if exists cpcm_nmi_allocations_select on public.nmi_plan_allocations;
create policy cpcm_nmi_allocations_select on public.nmi_plan_allocations
for select to authenticated using (
  exists (
    select 1 from public.nmi_transactions t
    where t.id=nmi_transaction_id
      and (
        lower(t.created_by_email)=lower(coalesce(auth.jwt()->>'email',''))
        or lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
        or exists (
          select 1 from public.app_users u
          where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
            and lower(coalesce(u.role,''))='admin'
            and coalesce(u.is_approved,true)=true
            and coalesce(u.is_active,true)=true
        )
      )
  )
);

drop policy if exists cpcm_nmi_webhooks_admin_select on public.nmi_webhook_events;
create policy cpcm_nmi_webhooks_admin_select on public.nmi_webhook_events
for select to authenticated using (
  lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
  or exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce(auth.jwt()->>'email',''))
      and lower(coalesce(u.role,''))='admin'
      and coalesce(u.is_approved,true)=true
      and coalesce(u.is_active,true)=true
  )
);

-- Finalize an NMI-approved sale atomically.
create or replace function public.cpcm_nmi_finalize_sale(
  p_nmi_transaction_id uuid,
  p_gateway_transaction_id text,
  p_gateway_status text,
  p_response_payload jsonb default '{}'::jsonb,
  p_response_code text default null,
  p_response_text text default null,
  p_authorization_code text default null,
  p_card_brand text default null,
  p_card_last4 text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  tx public.nmi_transactions%rowtype;
  acct public.accounts%rowtype;
  ledger_row public.payments_ledger%rowtype;
  plan_row public.payment_plans%rowtype;
  installment record;
  bal_before numeric(14,2);
  bal_after numeric(14,2);
  remaining_to_apply numeric(14,2);
  due_left numeric(14,2);
  apply_now numeric(14,2);
  receipt text;
begin
  select * into tx from public.nmi_transactions where id=p_nmi_transaction_id for update;
  if not found then raise exception 'NMI transaction not found'; end if;
  if tx.action <> 'sale' then raise exception 'Transaction is not a sale'; end if;

  if tx.ledger_id is not null then
    select * into ledger_row from public.payments_ledger where id=tx.ledger_id;
    return jsonb_build_object(
      'already_finalized',true,'ledger_id',ledger_row.id,'receipt_number',ledger_row.receipt_number,
      'balance_before',ledger_row.balance_before,'balance_after',ledger_row.balance_after,
      'gateway_transaction_id',ledger_row.gateway_transaction_id
    );
  end if;

  select * into acct from public.accounts where id=tx.account_id for update;
  if not found then raise exception 'Account not found'; end if;

  bal_before := greatest(0,coalesce(acct.current_balance,acct.principal,acct.original_balance,0));
  if tx.amount > bal_before + 0.01 then
    raise exception 'Approved amount exceeds current account balance';
  end if;
  bal_after := greatest(0,round((bal_before-tx.amount)::numeric,2));
  receipt := 'NMI-' || upper(substr(regexp_replace(coalesce(p_gateway_transaction_id,tx.id::text),'[^a-zA-Z0-9]','','g'),1,18));

  insert into public.payments_ledger(
    account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,
    balance_before,balance_after,notes,created_by_email,gateway_provider,
    gateway_transaction_id,gateway_status,gateway_response,authorization_code,
    card_brand,card_last4,idempotency_key,created_at,updated_at
  ) values (
    tx.account_id,current_date,tx.amount,'Payment','Card - NMI','Completed',receipt,
    bal_before,bal_after,'Secure one-time card payment processed through NMI.',tx.created_by_email,'NMI',
    p_gateway_transaction_id,coalesce(p_gateway_status,'Approved'),coalesce(p_response_payload,'{}'::jsonb),
    p_authorization_code,p_card_brand,p_card_last4,tx.idempotency_key,now(),now()
  ) returning * into ledger_row;

  remaining_to_apply := tx.amount;
  select * into plan_row
  from public.payment_plans
  where account_id=tx.account_id
    and lower(coalesce(status,'active')) not in ('paid','cancelled','canceled','closed')
  order by created_at desc
  limit 1
  for update;

  if found then
    for installment in
      select * from public.payment_plan_payments
      where account_id=tx.account_id
        and (plan_id=plan_row.id or payment_plan_id=plan_row.id)
        and lower(coalesce(status,'scheduled')) not in ('paid','cancelled','canceled')
        and coalesce(amount_due,amount,payment_amount,0) > coalesce(amount_paid,0)
      order by due_date asc nulls last, created_at asc
      for update
    loop
      exit when remaining_to_apply <= 0;
      due_left := greatest(0,coalesce(installment.amount_due,installment.amount,installment.payment_amount,0)-coalesce(installment.amount_paid,0));
      apply_now := least(due_left,remaining_to_apply);
      if apply_now > 0 then
        update public.payment_plan_payments
        set amount_paid=round((coalesce(amount_paid,0)+apply_now)::numeric,2),
            paid_date=case when coalesce(amount_paid,0)+apply_now+0.01 >= coalesce(amount_due,amount,payment_amount,0) then current_date else paid_date end,
            status=case when coalesce(amount_paid,0)+apply_now+0.01 >= coalesce(amount_due,amount,payment_amount,0) then 'Paid' else 'Partial' end,
            updated_at=now()
        where id=installment.id;

        insert into public.nmi_plan_allocations(
          nmi_transaction_id,ledger_id,payment_plan_id,payment_plan_payment_id,applied_amount
        ) values (tx.id,ledger_row.id,plan_row.id,installment.id,apply_now);
        remaining_to_apply := round((remaining_to_apply-apply_now)::numeric,2);
      end if;
    end loop;

    update public.payment_plans
    set remaining_amount=greatest(0,round((coalesce(remaining_amount,total_amount,0)-(tx.amount-remaining_to_apply))::numeric,2)),
        status=case when greatest(0,coalesce(remaining_amount,total_amount,0)-(tx.amount-remaining_to_apply)) <= 0.01 then 'Paid' else 'Active' end,
        updated_at=now()
    where id=plan_row.id;
  end if;

  update public.accounts
  set current_balance=bal_after,
      status=case when bal_after <= 0.01 then 'Settled' else coalesce(status,'Active') end,
      updated_at=now()
  where id=tx.account_id;

  update public.nmi_transactions
  set ledger_id=ledger_row.id,status='approved',gateway_transaction_id=p_gateway_transaction_id,
      response_code=p_response_code,response_text=p_response_text,authorization_code=p_authorization_code,
      card_brand=p_card_brand,card_last4=p_card_last4,response_payload=coalesce(p_response_payload,'{}'::jsonb),updated_at=now()
  where id=tx.id;

  insert into public.activity_logs(account_id,action_type,action_text,target_type,target_id,created_by_email,created_at)
  values(tx.account_id,'NMI Payment','Approved NMI card payment of $'||to_char(tx.amount,'FM999999990.00')||'. Receipt '||receipt||'.','payments_ledger',ledger_row.id::text,tx.created_by_email,now());

  insert into public.audit_logs(account_id,action_type,action_text,target_type,target_id,created_by_email,created_at)
  values(tx.account_id,'NMI Payment Approved','NMI transaction '||coalesce(p_gateway_transaction_id,'')||' applied to account balance.','payments_ledger',ledger_row.id::text,tx.created_by_email,now());

  return jsonb_build_object(
    'ledger_id',ledger_row.id,'receipt_number',receipt,'balance_before',bal_before,'balance_after',bal_after,
    'amount',tx.amount,'gateway_transaction_id',p_gateway_transaction_id,
    'card_brand',p_card_brand,'card_last4',p_card_last4
  );
end;
$$;

-- Apply an approved NMI void/refund atomically and reverse plan allocation.
create or replace function public.cpcm_nmi_apply_adjustment(
  p_nmi_transaction_id uuid,
  p_gateway_transaction_id text,
  p_gateway_status text,
  p_response_payload jsonb default '{}'::jsonb,
  p_response_code text default null,
  p_response_text text default null,
  p_authorization_code text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  tx public.nmi_transactions%rowtype;
  original public.payments_ledger%rowtype;
  acct public.accounts%rowtype;
  reversal public.payments_ledger%rowtype;
  allocation record;
  installment record;
  bal_before numeric(14,2);
  bal_after numeric(14,2);
  refundable numeric(14,2);
  remaining_to_reverse numeric(14,2);
  reverse_now numeric(14,2);
  next_paid numeric(14,2);
  receipt text;
begin
  select * into tx from public.nmi_transactions where id=p_nmi_transaction_id for update;
  if not found then raise exception 'NMI adjustment transaction not found'; end if;
  if tx.action not in ('refund','void') then raise exception 'Transaction is not a refund or void'; end if;

  if tx.ledger_id is not null then
    select * into reversal from public.payments_ledger where id=tx.ledger_id;
    return jsonb_build_object('already_finalized',true,'ledger_id',reversal.id,'balance_after',reversal.balance_after);
  end if;

  select * into original from public.payments_ledger where id=tx.parent_ledger_id for update;
  if not found or upper(coalesce(original.gateway_provider,'')) <> 'NMI' then
    raise exception 'Original NMI payment not found';
  end if;

  refundable := greatest(0,coalesce(original.amount,0)-coalesce(original.refunded_amount,0));
  if tx.amount > refundable + 0.01 then raise exception 'Adjustment exceeds refundable amount'; end if;

  select * into acct from public.accounts where id=original.account_id for update;
  if not found then raise exception 'Account not found'; end if;
  bal_before := greatest(0,coalesce(acct.current_balance,acct.principal,acct.original_balance,0));
  bal_after := round((bal_before+tx.amount)::numeric,2);
  receipt := upper(tx.action)||'-'||upper(substr(regexp_replace(coalesce(p_gateway_transaction_id,tx.id::text),'[^a-zA-Z0-9]','','g'),1,18));

  insert into public.payments_ledger(
    account_id,payment_date,amount,payment_type,payment_method,status,receipt_number,
    balance_before,balance_after,notes,created_by_email,gateway_provider,gateway_transaction_id,
    gateway_parent_transaction_id,gateway_status,gateway_response,authorization_code,idempotency_key,created_at,updated_at
  ) values (
    original.account_id,current_date,tx.amount,'Reversal','Card - NMI','Completed',receipt,
    bal_before,bal_after,initcap(tx.action)||' of NMI payment '||coalesce(original.gateway_transaction_id,''),
    tx.created_by_email,'NMI',p_gateway_transaction_id,original.gateway_transaction_id,
    coalesce(p_gateway_status,initcap(tx.action)||' Approved'),coalesce(p_response_payload,'{}'::jsonb),
    p_authorization_code,tx.idempotency_key,now(),now()
  ) returning * into reversal;

  remaining_to_reverse := tx.amount;
  for allocation in
    select * from public.nmi_plan_allocations
    where ledger_id=original.id and applied_amount > reversed_amount
    order by created_at desc
    for update
  loop
    exit when remaining_to_reverse <= 0;
    reverse_now := least(allocation.applied_amount-allocation.reversed_amount,remaining_to_reverse);
    if reverse_now > 0 and allocation.payment_plan_payment_id is not null then
      select * into installment from public.payment_plan_payments where id=allocation.payment_plan_payment_id for update;
      if found then
        next_paid := greatest(0,coalesce(installment.amount_paid,0)-reverse_now);
        update public.payment_plan_payments
        set amount_paid=next_paid,
            paid_date=case when next_paid+0.01 >= coalesce(amount_due,amount,payment_amount,0) then paid_date else null end,
            status=case when next_paid<=0.01 then 'Scheduled' when next_paid+0.01 >= coalesce(amount_due,amount,payment_amount,0) then 'Paid' else 'Partial' end,
            updated_at=now()
        where id=installment.id;
      end if;
      update public.nmi_plan_allocations
      set reversed_amount=round((coalesce(reversed_amount,0)+reverse_now)::numeric,2),updated_at=now()
      where id=allocation.id;
      if allocation.payment_plan_id is not null then
        update public.payment_plans
        set remaining_amount=round((coalesce(remaining_amount,0)+reverse_now)::numeric,2),status='Active',updated_at=now()
        where id=allocation.payment_plan_id;
      end if;
      remaining_to_reverse := round((remaining_to_reverse-reverse_now)::numeric,2);
    end if;
  end loop;

  update public.accounts
  set current_balance=bal_after,
      status=case when bal_before<=0.01 and bal_after>0.01 and lower(coalesce(status,'')) in ('settled','paid') then 'Active' else status end,
      updated_at=now()
  where id=original.account_id;

  update public.payments_ledger
  set refunded_amount=round((coalesce(refunded_amount,0)+tx.amount)::numeric,2),
      gateway_status=case
        when tx.action='void' then 'Voided'
        when coalesce(refunded_amount,0)+tx.amount+0.01 >= coalesce(amount,0) then 'Refunded'
        else 'Partially Refunded' end,
      voided_at=case when tx.action='void' then now() else voided_at end,
      refunded_at=case when tx.action='refund' then now() else refunded_at end,
      updated_at=now()
  where id=original.id;

  update public.nmi_transactions
  set ledger_id=reversal.id,status='approved',gateway_transaction_id=p_gateway_transaction_id,
      response_code=p_response_code,response_text=p_response_text,authorization_code=p_authorization_code,
      response_payload=coalesce(p_response_payload,'{}'::jsonb),updated_at=now()
  where id=tx.id;

  insert into public.activity_logs(account_id,action_type,action_text,target_type,target_id,created_by_email,created_at)
  values(original.account_id,'NMI '||initcap(tx.action),initcap(tx.action)||' of $'||to_char(tx.amount,'FM999999990.00')||' approved.','payments_ledger',reversal.id::text,tx.created_by_email,now());

  insert into public.audit_logs(account_id,action_type,action_text,target_type,target_id,created_by_email,created_at)
  values(original.account_id,'NMI '||initcap(tx.action)||' Approved','Gateway transaction '||coalesce(p_gateway_transaction_id,'')||' reversed $'||to_char(tx.amount,'FM999999990.00')||'.','payments_ledger',reversal.id::text,tx.created_by_email,now());

  return jsonb_build_object(
    'ledger_id',reversal.id,'receipt_number',receipt,'balance_before',bal_before,'balance_after',bal_after,
    'amount',tx.amount,'action',tx.action,'gateway_transaction_id',p_gateway_transaction_id
  );
end;
$$;

revoke all on function public.cpcm_nmi_finalize_sale(uuid,text,text,jsonb,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.cpcm_nmi_apply_adjustment(uuid,text,text,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.cpcm_nmi_finalize_sale(uuid,text,text,jsonb,text,text,text,text,text) to service_role;
grant execute on function public.cpcm_nmi_apply_adjustment(uuid,text,text,jsonb,text,text,text) to service_role;

-- Realtime publication is optional; ignore duplicate-publication errors.
do $$
begin
  begin alter publication supabase_realtime add table public.nmi_transactions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.nmi_webhook_events; exception when duplicate_object then null; end;
end $$;

commit;

select 'LIVE NMI Phase 1 R8N12 database migration completed.' as result;
