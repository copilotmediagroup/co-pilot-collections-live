begin;
do $$ begin
 if not exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='app_users' and t.tgname='cpcm_guard_app_user_privilege_update' and not t.tgisinternal) then raise exception 'PHASE44 BLOCKED: app_users privilege guard trigger missing'; end if;
 if has_function_privilege('authenticated','private.guard_app_user_privilege_update()','EXECUTE') then raise exception 'PHASE44 BLOCKED: privilege guard callable by authenticated'; end if;
 raise notice 'PHASE44 APP USER PRIVILEGE GATE PASSED';
end $$;
rollback;
