-- Co Pilot Collections Manager - Client Remittance + Agency Fee Accounting R8 (LIVE)
-- Run in the matching LIVE Supabase SQL Editor after the Client Portal R7 SQL.
-- Additive migration: preserves all existing accounts, payments, client assignments, and documents.

-- Capture the actual processor charge on an individual ledger payment when known.
alter table public.payments_ledger add column if not exists processor_fee numeric(14,2) not null default 0;
update public.payments_ledger set processor_fee=0 where processor_fee is null;

create table if not exists public.client_fee_schedules (
  id uuid primary key default gen_random_uuid(),
  client_email text not null,
  portfolio_name text not null,
  agency_fee_percent numeric(7,4) not null default 30,
  processor_fee_percent numeric(7,4) not null default 0,
  processor_fee_fixed numeric(14,2) not null default 0,
  processor_fee_payer text not null default 'client',
  remittance_frequency text not null default 'Monthly',
  payment_terms_days integer not null default 10,
  is_active boolean not null default true,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_fee_schedule_percent_check check (agency_fee_percent between 0 and 100 and processor_fee_percent between 0 and 100),
  constraint client_fee_schedule_payer_check check (lower(processor_fee_payer) in ('client','agency')),
  constraint client_fee_schedule_terms_check check (payment_terms_days between 0 and 365),
  unique (client_email, portfolio_name)
);

create table if not exists public.client_remittance_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  client_email text not null,
  client_company_name text,
  portfolio_name text not null,
  period_start date not null,
  period_end date not null,
  payment_count integer not null default 0,
  gross_collections numeric(14,2) not null default 0,
  reversals numeric(14,2) not null default 0,
  net_collections numeric(14,2) not null default 0,
  agency_fee_percent numeric(7,4) not null default 0,
  agency_fee_amount numeric(14,2) not null default 0,
  processor_fees numeric(14,2) not null default 0,
  processor_fee_payer text not null default 'client',
  adjustments numeric(14,2) not null default 0,
  net_remittance numeric(14,2) not null default 0,
  status text not null default 'Draft',
  due_date date,
  approved_at timestamptz,
  approved_by_email text,
  paid_at timestamptz,
  paid_by_email text,
  payment_reference text,
  notes text,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_remittance_period_check check (period_end >= period_start),
  constraint client_remittance_status_check check (lower(status) in ('draft','approved','paid','void')),
  constraint client_remittance_processor_payer_check check (lower(processor_fee_payer) in ('client','agency'))
);

create table if not exists public.client_remittance_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.client_remittance_batches(id) on delete cascade,
  payment_ledger_id text not null,
  account_id text,
  consumer_name text,
  account_number text,
  payment_date date,
  payment_type text,
  payment_method text,
  gross_amount numeric(14,2) not null default 0,
  signed_amount numeric(14,2) not null default 0,
  processor_fee numeric(14,2) not null default 0,
  released boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists client_fee_schedules_client_idx on public.client_fee_schedules(lower(client_email),lower(portfolio_name));
create index if not exists client_remittance_batches_client_idx on public.client_remittance_batches(lower(client_email),period_end desc);
create index if not exists client_remittance_batches_portfolio_idx on public.client_remittance_batches(lower(portfolio_name),period_end desc);
create index if not exists client_remittance_items_batch_idx on public.client_remittance_items(batch_id);
create unique index if not exists client_remittance_items_active_payment_idx on public.client_remittance_items(payment_ledger_id) where released=false;

alter table public.client_fee_schedules enable row level security;
alter table public.client_remittance_batches enable row level security;
alter table public.client_remittance_items enable row level security;

do $$
begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_fee_schedules' and policyname='cpcm_remit_fee_admin_all') then
    create policy cpcm_remit_fee_admin_all on public.client_fee_schedules for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_batches' and policyname='cpcm_remit_batch_select') then
    create policy cpcm_remit_batch_select on public.client_remittance_batches for select to authenticated
      using (
        lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
        or (lower(client_email)=lower(coalesce(auth.jwt()->>'email','')) and lower(status) in ('approved','paid'))
      );
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_batches' and policyname='cpcm_remit_batch_admin_write') then
    create policy cpcm_remit_batch_admin_write on public.client_remittance_batches for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_items' and policyname='cpcm_remit_item_select') then
    create policy cpcm_remit_item_select on public.client_remittance_items for select to authenticated
      using (exists(
        select 1 from public.client_remittance_batches b
        where b.id=client_remittance_items.batch_id
          and (
            lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com'
            or (lower(b.client_email)=lower(coalesce(auth.jwt()->>'email','')) and lower(b.status) in ('approved','paid'))
          )
      ));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='client_remittance_items' and policyname='cpcm_remit_item_admin_write') then
    create policy cpcm_remit_item_admin_write on public.client_remittance_items for all to authenticated
      using (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com')
      with check (lower(coalesce(auth.jwt()->>'email',''))='afinch2678@gmail.com');
  end if;
end $$;

create or replace function public.cpcm_admin_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); result jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  select jsonb_build_object(
    'clients',coalesce((select jsonb_agg(jsonb_build_object(
      'email',u.email,'full_name',u.full_name,'contact_name',u.client_contact_name,
      'company_name',u.client_company_name,'enabled',u.client_portal_enabled,
      'approved',u.is_approved,'active',u.is_active
    ) order by lower(coalesce(u.client_company_name,u.full_name,u.email)))
      from public.app_users u where lower(coalesce(u.role,''))='client'),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'client_email',lower(c.client_email),'portfolio_name',c.portfolio_name
    ) order by lower(c.client_email),lower(c.portfolio_name)) from public.client_portfolio_assignments c),'[]'::jsonb),
    'fee_schedules',coalesce((select jsonb_agg(to_jsonb(f) order by lower(f.client_email),lower(f.portfolio_name)) from public.client_fee_schedules f),'[]'::jsonb),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from (
      select * from public.client_remittance_batches order by created_at desc limit 500
    ) b),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.cpcm_admin_save_fee_schedule(
  target_client_email text,
  target_portfolio_name text,
  new_agency_fee_percent numeric,
  new_processor_fee_percent numeric,
  new_processor_fee_fixed numeric,
  new_processor_fee_payer text,
  new_remittance_frequency text,
  new_payment_terms_days integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  payer text:=lower(trim(coalesce(new_processor_fee_payer,'client')));
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if coalesce(new_agency_fee_percent,0)<0 or coalesce(new_agency_fee_percent,0)>100 then raise exception 'agency fee must be between 0 and 100'; end if;
  if coalesce(new_processor_fee_percent,0)<0 or coalesce(new_processor_fee_percent,0)>100 then raise exception 'processor fee percent must be between 0 and 100'; end if;
  if payer not in ('client','agency') then raise exception 'processor fee payer must be client or agency'; end if;

  insert into public.client_fee_schedules(
    client_email,portfolio_name,agency_fee_percent,processor_fee_percent,processor_fee_fixed,
    processor_fee_payer,remittance_frequency,payment_terms_days,is_active,created_by_email,updated_at
  ) values(
    target,portfolio,round(coalesce(new_agency_fee_percent,0),4),round(coalesce(new_processor_fee_percent,0),4),
    round(coalesce(new_processor_fee_fixed,0),2),payer,coalesce(nullif(trim(new_remittance_frequency),''),'Monthly'),
    greatest(0,least(365,coalesce(new_payment_terms_days,10))),true,actor,now()
  )
  on conflict(client_email,portfolio_name) do update set
    agency_fee_percent=excluded.agency_fee_percent,
    processor_fee_percent=excluded.processor_fee_percent,
    processor_fee_fixed=excluded.processor_fee_fixed,
    processor_fee_payer=excluded.processor_fee_payer,
    remittance_frequency=excluded.remittance_frequency,
    payment_terms_days=excluded.payment_terms_days,
    is_active=true,
    updated_at=now();

  return jsonb_build_object('ok',true,'client_email',target,'portfolio_name',portfolio);
end $$;

create or replace function public.cpcm_admin_preview_remittance(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  target text:=lower(trim(coalesce(target_client_email,'')));
  portfolio text:=trim(coalesce(target_portfolio_name,''));
  fee_pct numeric:=30;
  proc_pct numeric:=0;
  proc_fixed numeric:=0;
  proc_payer text:='client';
  frequency_name text:='Monthly';
  terms_days integer:=10;
  gross numeric:=0;
  reversal_total numeric:=0;
  net_total numeric:=0;
  processor_total numeric:=0;
  agency_total numeric:=0;
  client_processor_deduction numeric:=0;
  final_total numeric:=0;
  items_json jsonb:='[]'::jsonb;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  if target='' or portfolio='' then raise exception 'client and portfolio are required'; end if;
  if period_start_date is null or period_end_date is null or period_end_date<period_start_date then raise exception 'valid period dates are required'; end if;
  if not exists(select 1 from public.client_portfolio_assignments c where lower(c.client_email)=target and lower(trim(c.portfolio_name))=lower(portfolio)) then
    raise exception 'portfolio is not assigned to this client';
  end if;

  select f.agency_fee_percent,f.processor_fee_percent,f.processor_fee_fixed,lower(f.processor_fee_payer),f.remittance_frequency,f.payment_terms_days
  into fee_pct,proc_pct,proc_fixed,proc_payer,frequency_name,terms_days
  from public.client_fee_schedules f
  where lower(f.client_email)=target and lower(trim(f.portfolio_name))=lower(portfolio) and f.is_active=true
  limit 1;

  fee_pct:=coalesce(fee_pct,30); proc_pct:=coalesce(proc_pct,0); proc_fixed:=coalesce(proc_fixed,0);
  proc_payer:=coalesce(proc_payer,'client'); frequency_name:=coalesce(frequency_name,'Monthly'); terms_days:=coalesce(terms_days,10);

  with eligible as (
    select
      l.id::text payment_ledger_id,
      a.id::text account_id,
      coalesce(nullif(a.full_name,''),trim(concat_ws(' ',a.first_name,a.last_name)),'Consumer') consumer_name,
      coalesce(a.account_number,a.client_account_number,a.source_account_id,'') account_number,
      l.payment_date,
      coalesce(l.payment_type,'Payment') payment_type,
      coalesce(l.payment_method,'Other') payment_method,
      abs(coalesce(l.amount,0)) gross_amount,
      case when lower(coalesce(l.payment_type,'payment')) in ('reversal','adjustment debit') then -abs(coalesce(l.amount,0)) else abs(coalesce(l.amount,0)) end signed_amount,
      case
        when lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit') then
          case when coalesce(l.processor_fee,0)>0 then round(l.processor_fee,2)
               else round((abs(coalesce(l.amount,0))*proc_pct/100)+proc_fixed,2) end
        else 0
      end processor_fee,
      l.created_at
    from public.payments_ledger l
    join public.accounts a on a.id=l.account_id
    where lower(trim(coalesce(a.portfolio,'')))=lower(portfolio)
      and l.payment_date between period_start_date and period_end_date
      and lower(coalesce(l.status,''))='completed'
      and lower(coalesce(l.payment_type,'payment')) in ('payment','adjustment credit','reversal','adjustment debit')
      and not exists(
        select 1 from public.client_remittance_items ri
        where ri.payment_ledger_id=l.id::text and ri.released=false
      )
  )
  select
    coalesce(sum(case when signed_amount>0 then signed_amount else 0 end),0),
    coalesce(sum(case when signed_amount<0 then abs(signed_amount) else 0 end),0),
    coalesce(sum(processor_fee),0),
    coalesce(jsonb_agg(jsonb_build_object(
      'payment_ledger_id',payment_ledger_id,'account_id',account_id,'consumer_name',consumer_name,
      'account_number',account_number,'payment_date',payment_date,'payment_type',payment_type,
      'payment_method',payment_method,'gross_amount',gross_amount,'signed_amount',signed_amount,
      'processor_fee',processor_fee
    ) order by payment_date,created_at),'[]'::jsonb)
  into gross,reversal_total,processor_total,items_json
  from eligible;

  net_total:=round(gross-reversal_total,2);
  agency_total:=round(greatest(net_total,0)*fee_pct/100,2);
  client_processor_deduction:=case when proc_payer='client' then processor_total else 0 end;
  final_total:=round(net_total-agency_total-client_processor_deduction+coalesce(manual_adjustment,0),2);

  return jsonb_build_object(
    'client_email',target,'portfolio_name',portfolio,'period_start',period_start_date,'period_end',period_end_date,
    'payment_count',jsonb_array_length(items_json),'gross_collections',round(gross,2),'reversals',round(reversal_total,2),
    'net_collections',round(net_total,2),'agency_fee_percent',round(fee_pct,4),'agency_fee_amount',round(agency_total,2),
    'processor_fee_percent',round(proc_pct,4),'processor_fee_fixed',round(proc_fixed,2),'processor_fees',round(processor_total,2),
    'processor_fee_payer',proc_payer,'client_processor_deduction',round(client_processor_deduction,2),
    'adjustments',round(coalesce(manual_adjustment,0),2),'net_remittance',round(final_total,2),
    'remittance_frequency',frequency_name,'payment_terms_days',terms_days,
    'suggested_due_date',period_end_date+terms_days,'items',items_json
  );
end $$;

create or replace function public.cpcm_admin_create_remittance_batch(
  target_client_email text,
  target_portfolio_name text,
  period_start_date date,
  period_end_date date,
  manual_adjustment numeric,
  remittance_due_date date,
  batch_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  preview jsonb;
  new_batch public.client_remittance_batches%rowtype;
  item_record record;
  company_name text;
  number_value text;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  preview:=public.cpcm_admin_preview_remittance(target_client_email,target_portfolio_name,period_start_date,period_end_date,manual_adjustment);
  if coalesce((preview->>'payment_count')::integer,0)=0 then raise exception 'no unbatched completed payments were found for this period'; end if;

  select coalesce(nullif(trim(client_company_name),''),nullif(trim(full_name),''),lower(email)) into company_name
  from public.app_users where lower(email)=lower(trim(target_client_email)) limit 1;
  number_value:='REM-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.client_remittance_batches(
    batch_number,client_email,client_company_name,portfolio_name,period_start,period_end,payment_count,
    gross_collections,reversals,net_collections,agency_fee_percent,agency_fee_amount,processor_fees,
    processor_fee_payer,adjustments,net_remittance,status,due_date,notes,created_by_email,updated_at
  ) values(
    number_value,lower(trim(target_client_email)),company_name,trim(target_portfolio_name),period_start_date,period_end_date,
    (preview->>'payment_count')::integer,(preview->>'gross_collections')::numeric,(preview->>'reversals')::numeric,
    (preview->>'net_collections')::numeric,(preview->>'agency_fee_percent')::numeric,(preview->>'agency_fee_amount')::numeric,
    (preview->>'processor_fees')::numeric,preview->>'processor_fee_payer',(preview->>'adjustments')::numeric,
    (preview->>'net_remittance')::numeric,'Draft',coalesce(remittance_due_date,(preview->>'suggested_due_date')::date),
    nullif(trim(batch_notes),''),actor,now()
  ) returning * into new_batch;

  for item_record in select value item from jsonb_array_elements(preview->'items') loop
    insert into public.client_remittance_items(
      batch_id,payment_ledger_id,account_id,consumer_name,account_number,payment_date,payment_type,payment_method,
      gross_amount,signed_amount,processor_fee,released
    ) values(
      new_batch.id,item_record.item->>'payment_ledger_id',item_record.item->>'account_id',item_record.item->>'consumer_name',
      item_record.item->>'account_number',(item_record.item->>'payment_date')::date,item_record.item->>'payment_type',
      item_record.item->>'payment_method',(item_record.item->>'gross_amount')::numeric,(item_record.item->>'signed_amount')::numeric,
      (item_record.item->>'processor_fee')::numeric,false
    );
  end loop;

  return jsonb_build_object('ok',true,'batch',to_jsonb(new_batch));
end $$;

create or replace function public.cpcm_admin_update_remittance_batch(
  target_batch_id uuid,
  requested_action text,
  new_payment_reference text,
  new_notes text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  current_batch public.client_remittance_batches%rowtype;
begin
  if actor<>'afinch2678@gmail.com' then raise exception 'admin only'; end if;
  select * into current_batch from public.client_remittance_batches where id=target_batch_id for update;
  if not found then raise exception 'remittance batch not found'; end if;

  if action_name='approve' then
    if lower(current_batch.status)<>'draft' then raise exception 'only a draft batch can be approved'; end if;
    update public.client_remittance_batches set status='Approved',approved_at=now(),approved_by_email=actor,
      notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now() where id=target_batch_id;
  elsif action_name='paid' then
    if lower(current_batch.status)<>'approved' then raise exception 'approve the batch before marking it paid'; end if;
    update public.client_remittance_batches set status='Paid',paid_at=now(),paid_by_email=actor,
      payment_reference=nullif(trim(new_payment_reference),''),notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where id=target_batch_id;
  elsif action_name='draft' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot return to draft'; end if;
    update public.client_remittance_batches set status='Draft',approved_at=null,approved_by_email=null,updated_at=now()
      where id=target_batch_id;
  elsif action_name='void' then
    if lower(current_batch.status)='paid' then raise exception 'a paid batch cannot be voided'; end if;
    update public.client_remittance_batches set status='Void',notes=coalesce(nullif(trim(new_notes),''),notes),updated_at=now()
      where id=target_batch_id;
    update public.client_remittance_items set released=true where batch_id=target_batch_id;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select * into current_batch from public.client_remittance_batches where id=target_batch_id;
  return jsonb_build_object('ok',true,'batch',to_jsonb(current_batch));
end $$;

create or replace function public.cpcm_remittance_batch_detail(target_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  selected_batch public.client_remittance_batches%rowtype;
  is_admin boolean:=actor='afinch2678@gmail.com';
begin
  select * into selected_batch from public.client_remittance_batches where id=target_batch_id limit 1;
  if not found then raise exception 'remittance batch not found'; end if;
  if not is_admin and not (lower(selected_batch.client_email)=actor and lower(selected_batch.status) in ('approved','paid')) then
    raise exception 'not authorized for this remittance statement';
  end if;
  return jsonb_build_object(
    'batch',to_jsonb(selected_batch),
    'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.payment_date,i.consumer_name) from public.client_remittance_items i where i.batch_id=target_batch_id),'[]'::jsonb)
  );
end $$;

create or replace function public.cpcm_client_remittance_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  profile_row public.app_users%rowtype;
begin
  if actor='' then raise exception 'not authenticated'; end if;
  select * into profile_row from public.app_users where lower(email)=actor limit 1;
  if not found or lower(coalesce(profile_row.role,''))<>'client' or not coalesce(profile_row.client_portal_enabled,false)
     or not coalesce(profile_row.is_approved,false) or not coalesce(profile_row.is_active,false) then
    raise exception 'client portal access is not approved';
  end if;

  return jsonb_build_object(
    'profile',jsonb_build_object('email',profile_row.email,'company_name',profile_row.client_company_name,'can_download_reports',profile_row.client_can_download_reports),
    'summary',jsonb_build_object(
      'pending_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where lower(client_email)=actor and lower(status)='approved'),0),
      'paid_remittance',coalesce((select sum(net_remittance) from public.client_remittance_batches where lower(client_email)=actor and lower(status)='paid'),0),
      'agency_fees',coalesce((select sum(agency_fee_amount) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'processor_fees',coalesce((select sum(processor_fees) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'statement_count',coalesce((select count(*) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid')),0),
      'last_remittance_date',(select max(coalesce(paid_at,approved_at,created_at)) from public.client_remittance_batches where lower(client_email)=actor and lower(status) in ('approved','paid'))
    ),
    'batches',coalesce((select jsonb_agg(to_jsonb(b) order by b.period_end desc,b.created_at desc) from (
      select * from public.client_remittance_batches
      where lower(client_email)=actor and lower(status) in ('approved','paid')
      order by period_end desc,created_at desc limit 100
    ) b),'[]'::jsonb)
  );
end $$;

revoke all on function public.cpcm_admin_remittance_snapshot() from public;
revoke all on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) from public;
revoke all on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) from public;
revoke all on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) from public;
revoke all on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) from public;
revoke all on function public.cpcm_remittance_batch_detail(uuid) from public;
revoke all on function public.cpcm_client_remittance_snapshot() from public;

grant select on public.client_fee_schedules,public.client_remittance_batches,public.client_remittance_items to authenticated;
grant execute on function public.cpcm_admin_remittance_snapshot() to authenticated;
grant execute on function public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) to authenticated;
grant execute on function public.cpcm_admin_preview_remittance(text,text,date,date,numeric) to authenticated;
grant execute on function public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) to authenticated;
grant execute on function public.cpcm_admin_update_remittance_batch(uuid,text,text,text) to authenticated;
grant execute on function public.cpcm_remittance_batch_detail(uuid) to authenticated;
grant execute on function public.cpcm_client_remittance_snapshot() to authenticated;

notify pgrst,'reload schema';
