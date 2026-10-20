-- Phase 28: enforce tenant lifecycle status at the shared authorization boundary.
-- Suspended/cancelled tenants must not retain normal application access merely because membership is active.
begin;

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select m.organization_id
  from public.organization_members m
  join public.organizations o on o.id=m.organization_id
  where m.auth_user_id=(select auth.uid())
    and m.is_active=true
    and o.status in ('active','demo')
  order by m.created_at asc
  limit 1
$$;

create or replace function private.is_organization_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select (select auth.uid()) is not null
     and (
       private.is_platform_admin()
       or exists(
         select 1
         from public.organization_members m
         join public.organizations o on o.id=m.organization_id
         where m.auth_user_id=(select auth.uid())
           and m.organization_id=target_org
           and m.is_active=true
           and m.role in ('agency_admin','admin')
           and o.status in ('active','demo')
       )
     )
$$;

revoke all on function private.current_organization_id() from public,anon;
revoke all on function private.is_organization_admin(uuid) from public,anon;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
commit;
