-- Phase 46: explicit execute lockdown for legacy tenant SECURITY DEFINER RPCs.
begin;
do $$ declare r record; begin
 for r in select n.nspname schema_name,p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosecdef and n.nspname='public' and p.proname like 'cpcm_%'
 loop
  execute format('revoke all on function %I.%I(%s) from public, anon',r.schema_name,r.proname,r.args);
 end loop;
end $$;
commit;
