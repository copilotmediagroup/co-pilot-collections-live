begin;
do $$ declare bad int; begin
 select count(*) into bad from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosecdef and n.nspname in ('public','private') and (p.proname like 'cpcm_%' or p.proname in ('admin_clear_accounts','is_approved_app_user','can_access_account')) and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg where cfg ~ '^search_path=
 if bad<>0 then raise exception 'PHASE41 BLOCKED: % tenant SECURITY DEFINER functions lack empty search_path',bad; end if;
 raise notice 'PHASE41 DEFINER SEARCH PATH GATE PASSED';
end $$;
rollback;
);
 if bad<>0 then raise exception 'PHASE41 BLOCKED: % tenant SECURITY DEFINER functions lack empty search_path',bad; end if;
 raise notice 'PHASE41 DEFINER SEARCH PATH GATE PASSED';
end $$;
rollback;
