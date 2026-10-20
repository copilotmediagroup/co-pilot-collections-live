begin;
do $$ declare d text; begin
 select pg_get_expr(p.polqual,p.polrelid) into d from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='employee_commission_earnings' and p.polname='employee_commission_select_own_or_admin';
 if d ilike '%auth.jwt%' then raise exception 'PHASE49 BLOCKED: commission self-view still trusts JWT email'; end if;
 if d not ilike '%current_app_email%' then raise exception 'PHASE49 BLOCKED: commission self-view lacks canonical identity helper'; end if;
 raise notice 'PHASE49 CANONICAL ACTOR GATE PASSED';
end $$;
rollback;
