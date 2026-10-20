begin;
do $$ declare bad int; begin
 select count(*) into bad from pg_indexes i where i.schemaname='public' and i.tablename in ('activity_logs','call_results','client_remittance_items','collector_alerts') and i.indexdef ilike 'CREATE UNIQUE INDEX%' and i.indexdef not ilike '%organization_id%' and (i.indexdef ilike '%event_key%' or i.indexdef ilike '%attempt_id%' or i.indexdef ilike '%payment_ledger_id%' or i.indexdef ilike '%source_table%source_id%');
 if bad<>0 then raise exception 'PHASE40 BLOCKED: % residual global tenant uniqueness indexes remain',bad; end if;
 raise notice 'PHASE40 RESIDUAL TENANT UNIQUENESS GATE PASSED';
end $$;
rollback;
