begin;
-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 23
-- Replace legacy owner-email authorization helpers used by older RLS policies.

create or replace function public.is_app_admin()
returns boolean language sql stable set search_path=public as $$
  select private.is_platform_admin()
      or private.is_organization_admin(private.current_organization_id());
$$;

create or replace function public.is_approved_app_user()
returns boolean language sql security definer stable set search_path=public as $$
  select private.is_platform_admin()
     or exists (
       select 1 from public.app_users u
       where u.organization_id=private.current_organization_id()
         and lower(u.email)=public.current_app_email()
         and coalesce(u.is_approved,false)=true
         and coalesce(u.is_active,false)=true
         and lower(coalesce(u.approval_status,'pending'))='approved'
     );
$$;

create or replace function public.can_access_account(p_account_id uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select private.is_platform_admin()
     or exists (
       select 1 from public.accounts a
       where a.organization_id=private.current_organization_id()
         and a.id=p_account_id
         and public.is_approved_app_user()
         and (
           private.is_organization_admin(a.organization_id)
           or lower(coalesce(a.assigned_to_email,''))=public.current_app_email()
         )
     );
$$;
revoke all on function public.is_app_admin() from public,anon;
revoke all on function public.is_approved_app_user() from public,anon;
revoke all on function public.can_access_account(uuid) from public,anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_approved_app_user() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;
commit;
