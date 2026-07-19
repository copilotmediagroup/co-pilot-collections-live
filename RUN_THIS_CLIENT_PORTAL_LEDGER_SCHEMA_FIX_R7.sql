-- Co Pilot Collections Manager - Client Portal Ledger Schema Fix R7 (LIVE)
-- Run this in the matching LIVE Supabase SQL Editor after R5/R6.
-- Fixes: column l.payment_type does not exist.
-- This is additive and preserves existing payment rows.

do $$
begin
  if to_regclass('public.payments_ledger') is null then
    raise exception 'public.payments_ledger does not exist. Create/run the payment ledger schema before the client portal.';
  end if;
end $$;

alter table public.payments_ledger add column if not exists payment_date date;
alter table public.payments_ledger add column if not exists amount numeric(14,2);
alter table public.payments_ledger add column if not exists payment_type text;
alter table public.payments_ledger add column if not exists payment_method text;
alter table public.payments_ledger add column if not exists status text;
alter table public.payments_ledger add column if not exists receipt_number text;
alter table public.payments_ledger add column if not exists balance_before numeric(14,2);
alter table public.payments_ledger add column if not exists balance_after numeric(14,2);
alter table public.payments_ledger add column if not exists notes text;
alter table public.payments_ledger add column if not exists created_by_email text;
alter table public.payments_ledger add column if not exists plan_payment_id uuid;
alter table public.payments_ledger add column if not exists created_at timestamptz default now();
alter table public.payments_ledger add column if not exists updated_at timestamptz default now();

alter table public.payments_ledger alter column payment_type set default 'Payment';
alter table public.payments_ledger alter column payment_method set default 'Other';
alter table public.payments_ledger alter column status set default 'Completed';
alter table public.payments_ledger alter column created_at set default now();
alter table public.payments_ledger alter column updated_at set default now();

update public.payments_ledger
set payment_type='Payment'
where nullif(trim(payment_type),'') is null;

update public.payments_ledger
set payment_method='Other'
where nullif(trim(payment_method),'') is null;

update public.payments_ledger
set status='Completed'
where nullif(trim(status),'') is null;

update public.payments_ledger
set payment_date=coalesce(payment_date,created_at::date,current_date)
where payment_date is null;

update public.payments_ledger
set updated_at=coalesce(updated_at,created_at,now())
where updated_at is null;

create index if not exists payments_ledger_account_date_idx
  on public.payments_ledger(account_id,payment_date desc);

notify pgrst,'reload schema';
