create or replace function public.cpcm_dialer_actor_email() returns text language sql stable set search_path=public,auth as $$ select lower(coalesce(auth.jwt()->>'email','')); $$;
create or replace function public.cpcm_broadcast_actor_email() returns text language sql stable set search_path=public,auth as $$ select lower(coalesce(auth.jwt()->>'email','')); $$;
do $$
declare r record;
begin
 for r in select p.oid::regprocedure::text sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proname like 'cpcm_%'
 loop
   execute format('revoke execute on function %s from public, anon',r.sig);
   if r.proname not like 'cpcm_nmi_%' then execute format('grant execute on function %s to authenticated',r.sig); end if;
 end loop;
end $$;
drop function if exists public.cpcm_save_call_result(uuid,jsonb,text);
