-- Phase 40: remove residual legacy global uniqueness from tenant-owned operational tables.
begin;
do $$ declare c record; begin
 if to_regclass('public.activity_logs') is not null then
  for c in select conname from pg_constraint where conrelid='public.activity_logs'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%event_key%' loop execute format('alter table public.activity_logs drop constraint %I',c.conname); end loop;
  drop index if exists public.activity_logs_event_key_unique_idx;
  create unique index if not exists activity_logs_org_event_key_unique_idx on public.activity_logs(organization_id,event_key) where event_key is not null and btrim(event_key)<>'';
 end if;
 if to_regclass('public.call_results') is not null then
  for c in select conname from pg_constraint where conrelid='public.call_results'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%attempt_id%' loop execute format('alter table public.call_results drop constraint %I',c.conname); end loop;
  drop index if exists public.call_results_attempt_id_unique_idx;
  create unique index if not exists call_results_org_attempt_id_unique_idx on public.call_results(organization_id,attempt_id) where attempt_id is not null;
 end if;
 if to_regclass('public.client_remittance_items') is not null then
  for c in select conname from pg_constraint where conrelid='public.client_remittance_items'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%payment_ledger_id%' loop execute format('alter table public.client_remittance_items drop constraint %I',c.conname); end loop;
  drop index if exists public.client_remittance_items_payment_ledger_id_key;
  create unique index if not exists client_remittance_items_org_payment_ledger_uq on public.client_remittance_items(organization_id,payment_ledger_id) where payment_ledger_id is not null;
 end if;
 if to_regclass('public.collector_alerts') is not null then
  drop index if exists public.collector_alerts_source_open_unique_idx;
  create unique index if not exists collector_alerts_org_source_open_unique_idx on public.collector_alerts(organization_id,source_table,source_id,alert_type) where status='Open' and source_id is not null and btrim(source_id)<>'';
 end if;
end $$;
commit;
