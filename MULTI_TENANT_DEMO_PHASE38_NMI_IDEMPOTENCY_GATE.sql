begin;
do $$ begin
 if to_regclass('public.nmi_transactions') is not null then
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='nmi_transactions' and indexdef ilike '%organization_id%' and indexdef ilike '%idempotency_key%' and indexdef ilike '%unique%') then raise exception 'PHASE38 BLOCKED: NMI transaction idempotency is not tenant-qualified'; end if;
  if exists(select 1 from pg_constraint where conrelid='public.nmi_transactions'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%unique (idempotency_key)%') then raise exception 'PHASE38 BLOCKED: global NMI idempotency constraint remains'; end if;
 end if;
 if to_regclass('public.payments_ledger') is not null and to_regclass('public.payments_ledger_nmi_idempotency_uq') is not null then raise exception 'PHASE38 BLOCKED: legacy global ledger NMI idempotency index remains'; end if;
 raise notice 'PHASE38 NMI TENANT IDEMPOTENCY GATE PASSED';
end $$;
rollback;
