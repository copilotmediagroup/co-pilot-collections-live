-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 24
-- Tenant-bind the legacy client-role helper used by restrictive client portal RLS.
begin;
create or replace function public.cpcm_current_is_client()
returns boolean
language sql
stable
security definer
set search_path=''
as $cpcm$
  select private.current_organization_id() is not null
     and exists(
       select 1
       from public.app_users u
       where u.organization_id=private.current_organization_id()
         and lower(u.email)=public.current_app_email()
         and lower(coalesce(u.role,''))='client'
         and coalesce(u.is_active,false)=true
     );
$cpcm$;
revoke all on function public.cpcm_current_is_client() from public,anon;
grant execute on function public.cpcm_current_is_client() to authenticated;
commit;
