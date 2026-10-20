-- Phase 47: harden legacy non-cpcm SECURITY DEFINER helpers that remain part of tenant authorization.
begin;
alter function public.admin_clear_accounts() set search_path='';
alter function public.is_approved_app_user() set search_path='';
alter function public.can_access_account(uuid) set search_path='';
revoke all on function public.admin_clear_accounts() from public,anon;
revoke all on function public.is_approved_app_user() from public,anon;
revoke all on function public.can_access_account(uuid) from public,anon;
grant execute on function public.admin_clear_accounts() to authenticated;
grant execute on function public.is_approved_app_user() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;
commit;
