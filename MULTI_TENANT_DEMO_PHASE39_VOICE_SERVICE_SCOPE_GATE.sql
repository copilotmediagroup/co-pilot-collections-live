-- Phase 39 is a source/runtime gate; no database mutation is required.
begin;
do $$ begin
 foreach _tbl in array array['voice_broadcast_campaigns','voice_broadcast_campaign_accounts','voice_broadcast_calls','voice_broadcast_live_transfers'] loop
  if to_regclass('public.'||_tbl) is not null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name=_tbl and column_name='organization_id') then raise exception 'PHASE39 BLOCKED: % has no organization_id',_tbl; end if;
 end loop;
 raise notice 'PHASE39 VOICE SERVICE TENANT COLUMNS GATE PASSED';
end $$;
rollback;
