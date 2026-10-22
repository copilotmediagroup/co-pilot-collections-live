-- Phase 57: commercial subscription access gate.
-- New production agencies can exist before payment, but tenant access resolves only after activation.
-- Demo tenants remain accessible. Platform admins remain outside tenant access.
begin;

alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations
  add constraint organizations_status_check
  check (status in ('pending_payment','active','past_due','suspended','cancelled','demo'));

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
  if clean_status not in ('pending_payment','active','past_due','suspended','cancelled','demo') then raise exception 'Invalid organization status'; end if;
  update public.organizations set status=clean_status,updated_at=now()
  where id=p_organization_id returning * into out_row;
  if out_row.id is null then raise exception 'Organization not found'; end if;
  return out_row;
end
$$;

create or replace function public.cpcm_platform_provision_organization(
  p_name text,
  p_slug text,
  p_admin_user_id uuid,
  p_plan text default 'standard',
  p_is_demo boolean default false
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  oid uuid := gen_random_uuid();
  clean_name text := nullif(btrim(p_name),'');
  clean_slug text := lower(nullif(btrim(p_slug),''));
begin
  if not private.is_platform_admin() then raise exception 'Platform admin required'; end if;
  if clean_name is null then raise exception 'Organization name required'; end if;
  if clean_slug is null or clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Organization slug must contain lowercase letters, numbers, and single hyphens only'; end if;
  if p_admin_user_id is null then raise exception 'Initial admin auth user required'; end if;
  if exists(select 1 from public.organizations o where o.slug=clean_slug) then raise exception 'Organization slug already exists'; end if;
  if not exists(select 1 from auth.users u where u.id=p_admin_user_id) then raise exception 'Initial admin auth user does not exist'; end if;
  if exists(select 1 from public.organization_members m where m.auth_user_id=p_admin_user_id) then raise exception 'Initial admin already has an organization membership'; end if;

  insert into public.organizations(id,name,slug,status,plan,is_demo)
  values(oid,clean_name,clean_slug,case when coalesce(p_is_demo,false) then 'demo' else 'pending_payment' end,coalesce(nullif(btrim(p_plan),''),'standard'),coalesce(p_is_demo,false));
  insert into public.organization_members(organization_id,auth_user_id,role,is_active)
  values(oid,p_admin_user_id,'agency_admin',true);
  return oid;
end
$$;

revoke all on function public.cpcm_platform_set_organization_status(uuid,text) from public,anon,authenticated;
revoke all on function public.cpcm_platform_provision_organization(text,text,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.cpcm_platform_set_organization_status(uuid,text) to authenticated;
grant execute on function public.cpcm_platform_provision_organization(text,text,uuid,text,boolean) to authenticated;
commit;
