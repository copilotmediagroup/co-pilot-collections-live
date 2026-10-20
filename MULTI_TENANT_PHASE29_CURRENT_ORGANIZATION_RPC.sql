-- Phase 29: expose safe status-aware tenant resolution to authenticated browser clients.
begin;
create or replace function public.cpcm_current_organization()
returns uuid
language sql
stable
security invoker
set search_path=''
as $$ select private.current_organization_id() $$;
revoke all on function public.cpcm_current_organization() from public,anon;
grant execute on function public.cpcm_current_organization() to authenticated;
commit;
