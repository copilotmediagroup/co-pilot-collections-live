begin;
do $$ declare d text; begin
 select pg_get_functiondef('public.cpcm_platform_provision_organization(text,text,uuid,text,boolean)'::regprocedure) into d;
 if d ilike '%m.is_active = true%' or d ilike '%m.is_active=true%' then raise exception 'PHASE43 BLOCKED: provisioning ignores inactive prior memberships'; end if;
 if d not ilike '%already has an organization membership%' then raise exception 'PHASE43 BLOCKED: prior membership rejection missing'; end if;
 raise notice 'PHASE43 PROVISIONING MEMBERSHIP GATE PASSED';
end $$;
rollback;
