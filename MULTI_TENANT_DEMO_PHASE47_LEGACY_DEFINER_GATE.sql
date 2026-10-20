begin;
do $$ declare fn regprocedure; bad int:=0; cfg text[]; begin
 foreach fn in array array['public.admin_clear_accounts()'::regprocedure,'public.is_approved_app_user()'::regprocedure,'public.can_access_account(uuid)'::regprocedure] loop
  select p.proconfig into cfg from pg_proc p where p.oid=fn;
  if not exists(select 1 from unnest(coalesce(cfg,'{}'::text[])) x where x ~ '^search_path=$') then bad:=bad+1; end if;
  if has_function_privilege('anon',fn,'EXECUTE') or has_function_privilege('public',fn,'EXECUTE') then bad:=bad+1; end if;
 end loop;
 if bad<>0 then raise exception 'PHASE47 BLOCKED: % legacy definer hardening checks failed',bad; end if;
 raise notice 'PHASE47 LEGACY DEFINER GATE PASSED';
end $$;
rollback;
