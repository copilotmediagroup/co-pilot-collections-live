begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_my_commission_summary()'::regprocedure) into d;
 if d ilike '%auth.jwt%' or d not ilike '%current_app_email%' then raise exception 'PHASE54 BLOCKED: commission self identity is not canonical'; end if;
 select pg_get_functiondef('public.cpcm_record_call_attempt(uuid,text,text,text,text)'::regprocedure) into d;
 if d ilike '%auth.jwt%' or d ilike '%p_created_by_email%unknown%' or d not ilike '%current_app_email%' then raise exception 'PHASE54 BLOCKED: call attempt actor identity is not canonical'; end if;
 select pg_get_functiondef('public.cpcm_complete_call_attempt(uuid,text,text,text,text,text,text,integer,text,boolean,boolean,boolean,boolean,boolean,timestamptz,numeric,text,text)'::regprocedure) into d;
 if d ilike '%auth.jwt%' or d ilike '%p_created_by_email%unknown%' or d not ilike '%current_app_email%' then raise exception 'PHASE54 BLOCKED: call completion actor identity is not canonical'; end if;
 raise notice 'PHASE54 CANONICAL ACTOR GATE PASSED';
end $$;
rollback;
