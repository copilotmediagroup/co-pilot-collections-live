begin;
do $$ declare ok int; begin
 select count(*) into ok from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='app_users' and t.tgname='cpcm_guard_app_user_membership_role_consistency' and not t.tgisinternal and t.tgdeferrable;
 if ok<>1 then raise exception 'PHASE52 BLOCKED: deferred profile/membership role consistency guard missing'; end if;
 if has_function_privilege('authenticated','private.guard_app_user_membership_role_consistency()','EXECUTE') then raise exception 'PHASE52 BLOCKED: browser can execute consistency guard'; end if;
 raise notice 'PHASE52 ROLE CONSISTENCY GATE PASSED';
end $$;
rollback;
