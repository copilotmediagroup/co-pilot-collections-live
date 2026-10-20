-- Phase 27: platform-controlled tenant lifecycle administration.
-- Platform admins can inspect/suspend/reactivate a tenant without receiving tenant membership.
begin;

create or replace function public.cpcm_platform_set_organization_status(
  p_organization_id uuid,
  p_status text
) returns public.organizations
language plpgsql
security definer
set search_path=''
as $$
declare
  clean_status text := lower(nullif(btrim(p_status),''));
  out_row public.organizations;
begin
  if not private.is_platform_admin() then raise exception 'Platform admin required'; end if;
  if p_organization_id is null then raise exception 'Organization id required'; end if;
  if clean_status not in ('active','suspended','cancelled','demo') then raise exception 'Invalid organization status'; end if;
  update public.organizations
     set status=clean_status, updated_at=now()
   where id=p_organization_id
   returning * into out_row;
  if out_row.id is null then raise exception 'Organization not found'; end if;
  return out_row;
end
$$;

create or replace function public.cpcm_platform_list_organizations()
returns table(
  id uuid,name text,slug text,status text,plan text,is_demo boolean,
  active_members bigint,agency_admins bigint,created_at timestamptz,updated_at timestamptz
)
language sql
stable
security definer
set search_path=''
as $$
  select o.id,o.name,o.slug,o.status,o.plan,o.is_demo,
         count(m.id) filter(where m.is_active),
         count(m.id) filter(where m.is_active and m.role in ('agency_admin','admin')),
         o.created_at,o.updated_at
  from public.organizations o
  left join public.organization_members m on m.organization_id=o.id
  where private.is_platform_admin()
  group by o.id,o.name,o.slug,o.status,o.plan,o.is_demo,o.created_at,o.updated_at
  order by o.created_at desc
$$;

revoke all on function public.cpcm_platform_set_organization_status(uuid,text) from public,anon,authenticated;
revoke all on function public.cpcm_platform_list_organizations() from public,anon,authenticated;
grant execute on function public.cpcm_platform_set_organization_status(uuid,text) to authenticated;
grant execute on function public.cpcm_platform_list_organizations() to authenticated;
commit;
