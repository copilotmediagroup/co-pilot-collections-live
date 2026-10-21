begin;
do $$ declare r record; d text; begin
 for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cpcm_%' loop
  select pg_get_functiondef(r.sig) into d;
  if d ilike '%auth.jwt%email%' then raise exception 'PHASE55 BLOCKED: function still trusts JWT email'; end if;
 end loop;
 raise notice 'PHASE55 CANONICAL IDENTITY GATE PASSED';
end $$;
rollback;
