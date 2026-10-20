begin;
do $$ declare d text; begin
 if to_regclass('private.platform_admins') is null then raise exception 'PHASE36 BLOCKED: platform admin registry missing'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and pg_get_functiondef(p.oid) ilike '%afinch2678@gmail.com%') then raise exception 'PHASE36 BLOCKED: owner email remains in database function'; end if;
 raise notice 'PHASE36 PLATFORM ADMIN BOOTSTRAP GATE PASSED';
end $$;
rollback;
