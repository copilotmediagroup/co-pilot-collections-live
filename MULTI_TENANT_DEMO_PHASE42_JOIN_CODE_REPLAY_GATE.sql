begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_join_organization(text)'::regprocedure) into d;
 if d not ilike '%User already has an organization membership%' then raise exception 'PHASE42 BLOCKED: inactive cross-org membership replay is not rejected'; end if;
 if d not ilike '%different role%' then raise exception 'PHASE42 BLOCKED: pending role rewrite is not rejected'; end if;
 if d ilike '%set role=excluded.role%' then raise exception 'PHASE42 BLOCKED: join replay can rewrite membership role'; end if;
 raise notice 'PHASE42 JOIN CODE REPLAY GATE PASSED';
end $$;
rollback;
