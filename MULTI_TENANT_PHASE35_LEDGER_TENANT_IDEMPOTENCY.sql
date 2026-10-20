-- Phase 35: receipt/idempotency uniqueness belongs to a tenant, not the whole SaaS database.
begin;
drop index if exists public.payments_ledger_receipt_number_unique_idx;
create unique index if not exists payments_ledger_org_receipt_number_unique_idx
 on public.payments_ledger(organization_id,receipt_number)
 where receipt_number is not null and btrim(receipt_number)<>'';
create unique index if not exists payments_ledger_org_idempotency_key_unique_idx
 on public.payments_ledger(organization_id,idempotency_key)
 where idempotency_key is not null and btrim(idempotency_key)<>'';
commit;
