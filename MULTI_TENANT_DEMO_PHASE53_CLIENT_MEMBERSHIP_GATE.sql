begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean)'::regprocedure) into d;
 if d not ilike '%update public.organization_members%' or d not ilike '%role=''client''%' then raise exception 'PHASE53 BLOCKED: client save does not synchronize membership role'; end if;
 if d ilike '%insert into public.app_users%' then raise exception 'PHASE53 BLOCKED: client admin RPC may create profile outside join onboarding'; end if;
 select pg_get_functiondef('public.cpcm_admin_disable_client_portal_access(text)'::regprocedure) into d;
 if d not ilike '%update public.organization_members%' or d not ilike '%is_active=false%' then raise exception 'PHASE53 BLOCKED: client disable does not suspend membership'; end if;
 raise notice 'PHASE53 CLIENT MEMBERSHIP GATE PASSED';
end $$;
rollback;
