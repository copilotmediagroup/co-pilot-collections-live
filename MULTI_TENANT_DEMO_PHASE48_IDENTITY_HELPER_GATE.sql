begin;
do $$ declare d text; cfg text[]; begin
 select pg_get_functiondef('public.current_app_email()'::regprocedure) into d;
 if d ilike '%auth.jwt()%' then raise exception 'PHASE48 BLOCKED: current_app_email still trusts JWT email claim'; end if;
 if d not ilike '%auth.users%' or d not ilike '%auth.uid()%' then raise exception 'PHASE48 BLOCKED: current_app_email is not auth-user bound'; end if;
 if has_function_privilege('anon','public.current_app_email()','EXECUTE') then raise exception 'PHASE48 BLOCKED: anon can execute identity helper'; end if;
 select p.proconfig into cfg from pg_proc p where p.oid='public.is_app_admin()'::regprocedure;
 if not exists(select 1 from unnest(coalesce(cfg,'{}'::text[])) x where x ~ '^search_path=$') then raise exception 'PHASE48 BLOCKED: is_app_admin search_path not hardened'; end if;
 raise notice 'PHASE48 IDENTITY HELPER GATE PASSED';
end $$;
rollback;
