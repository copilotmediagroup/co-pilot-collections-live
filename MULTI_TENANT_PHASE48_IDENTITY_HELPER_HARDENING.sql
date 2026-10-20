-- Phase 48: make legacy email identity helper derive from auth.users, not caller-controlled JWT email claims.
begin;
create or replace function public.current_app_email()
returns text language sql stable security definer set search_path='' as $$
 select lower(coalesce((select u.email::text from auth.users u where u.id=auth.uid()),''));
$$;
revoke all on function public.current_app_email() from public,anon;
grant execute on function public.current_app_email() to authenticated;
alter function public.is_app_admin() set search_path='';
revoke all on function public.is_app_admin() from public,anon;
grant execute on function public.is_app_admin() to authenticated;
commit;
