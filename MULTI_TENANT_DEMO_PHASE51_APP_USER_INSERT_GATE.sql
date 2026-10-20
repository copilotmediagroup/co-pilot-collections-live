begin;
do $$ declare ok int; begin
 select count(*) into ok from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='app_users' and t.tgname='cpcm_guard_app_user_privilege_insert' and not t.tgisinternal;
 if ok<>1 then raise exception 'PHASE51 BLOCKED: app_users insert privilege guard missing'; end if;
 if has_function_privilege('authenticated','private.guard_app_user_privilege_insert()','EXECUTE') then raise exception 'PHASE51 BLOCKED: browser can directly execute insert guard'; end if;
 raise notice 'PHASE51 APP USER INSERT GATE PASSED';
end $$;
rollback;
