begin;
do $$ declare d text; begin
 if not exists(select 1 from pg_indexes where schemaname='public' and tablename='payments_ledger' and indexname='payments_ledger_org_receipt_number_unique_idx' and indexdef ilike '%organization_id%receipt_number%') then raise exception 'PHASE35 BLOCKED: tenant receipt uniqueness missing'; end if;
 if not exists(select 1 from pg_indexes where schemaname='public' and tablename='payments_ledger' and indexname='payments_ledger_org_idempotency_key_unique_idx' and indexdef ilike '%organization_id%idempotency_key%') then raise exception 'PHASE35 BLOCKED: tenant idempotency uniqueness missing'; end if;
 select pg_get_functiondef('public.cpcm_mark_payment_promise_paid(uuid,text)'::regprocedure) into d;
 if d not ilike '%ON CONFLICT (organization_id, receipt_number)%' then raise exception 'PHASE35 BLOCKED: promise conflict target not tenant-qualified'; end if;
 select pg_get_functiondef('public.cpcm_post_manual_ledger_payment(uuid,numeric,date,text,text,numeric,text,text,text)'::regprocedure) into d;
 if d not ilike '%ON CONFLICT (organization_id, receipt_number)%' then raise exception 'PHASE35 BLOCKED: manual ledger conflict target not tenant-qualified'; end if;
 raise notice 'PHASE35 LEDGER TENANT IDEMPOTENCY GATE PASSED';
end $$;
rollback;
