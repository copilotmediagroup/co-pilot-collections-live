begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_admin_manage_staff_user(text,text,text)'::regprocedure) into d;
 if d not ilike '%organization_members%' or d not ilike '%auth.users%' then raise exception 'PHASE32 BLOCKED: staff lifecycle is not membership-bound'; end if;
 if d not ilike '%is_active = false%' or d not ilike '%is_active = true%' then raise exception 'PHASE32 BLOCKED: membership activation/deactivation missing'; end if;
 if d not ilike '%user must be approved before activation%' then raise exception 'PHASE32 BLOCKED: activation can bypass approval'; end if;
 if d not ilike '%private.is_organization_admin%' then raise exception 'PHASE32 BLOCKED: admin guard missing'; end if;
 if has_function_privilege('anon','public.cpcm_admin_manage_staff_user(text,text,text)','EXECUTE') then raise exception 'PHASE32 BLOCKED: anon can manage staff'; end if;
 raise notice 'PHASE32 MEMBERSHIP LIFECYCLE GATE PASSED';
end $$;
rollback;
