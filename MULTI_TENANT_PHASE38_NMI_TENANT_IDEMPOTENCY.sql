-- Phase 38: tenant-qualify caller-generated NMI idempotency keys.
begin;
do $$ declare c record; begin
 if to_regclass('public.nmi_transactions') is not null then
  for c in select conname from pg_constraint where conrelid='public.nmi_transactions'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%idempotency_key%' loop execute format('alter table public.nmi_transactions drop constraint %I',c.conname); end loop;
  drop index if exists public.nmi_transactions_idempotency_key_key;
  create unique index if not exists nmi_transactions_org_idempotency_key_uq on public.nmi_transactions(organization_id,idempotency_key) where idempotency_key is not null and btrim(idempotency_key)<>'';
 end if;
 -- Phase 35 owns the canonical payments_ledger tenant idempotency key.
 drop index if exists public.payments_ledger_nmi_idempotency_uq;
end $$;
commit;
