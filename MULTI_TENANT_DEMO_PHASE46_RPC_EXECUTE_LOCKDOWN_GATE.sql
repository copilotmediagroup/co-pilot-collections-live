begin;
do $$ declare bad int; begin
 select count(*) into bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosecdef and n.nspname='public' and p.proname like 'cpcm_%' and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('public',p.oid,'EXECUTE'));
 if bad<>0 then raise exception 'PHASE46 BLOCKED: % tenant SECURITY DEFINER RPCs remain executable by anon/public',bad; end if;
 raise notice 'PHASE46 RPC EXECUTE LOCKDOWN GATE PASSED';
end $$;
rollback;
