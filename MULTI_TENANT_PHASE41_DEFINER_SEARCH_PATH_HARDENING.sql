-- Phase 41: harden legacy tenant SECURITY DEFINER functions against search_path object shadowing.
begin;
do $$ declare r record; begin
 for r in
  select n.nspname schema_name,p.proname,pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where p.prosecdef and n.nspname in ('public','private') and (p.proname like 'cpcm_%' or p.proname in ('admin_clear_accounts','is_approved_app_user','can_access_account'))
 loop
  execute format('alter function %I.%I(%s) set search_path = %L',r.schema_name,r.proname,r.args,'');
 end loop;
end $$;
commit;
