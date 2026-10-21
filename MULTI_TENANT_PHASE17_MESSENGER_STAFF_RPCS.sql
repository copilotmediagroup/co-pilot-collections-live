-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 17
-- Tenant-safe Messenger staff naming and directory RPCs.

create or replace function public.cpcm_update_staff_display_name(target_email text, new_full_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text := public.current_app_email();
  target text := lower(trim(coalesce(target_email,'')));
  clean text := nullif(trim(coalesce(new_full_name,'')),'');
  oid uuid := private.current_organization_id();
  actor_is_admin boolean := private.is_organization_admin(oid);
begin
  if actor_email = '' or oid is null then raise exception 'not authenticated in an organization'; end if;
  if target = '' then raise exception 'target_email required'; end if;
  if not (actor_is_admin or actor_email = target) then raise exception 'not allowed'; end if;

  update public.app_users
     set full_name=clean, updated_at=now()
   where organization_id=oid and lower(email)=target;

  if not found then
    if actor_email <> target then raise exception 'staff user not found in current organization'; end if;
    insert into public.app_users
      (organization_id,email,role,full_name,approval_status,is_approved,is_active,created_at,updated_at,last_seen_at)
    values
      (oid,target,'employee',clean,'pending',false,false,now(),now(),now());
  end if;
  return jsonb_build_object('ok',true,'email',target,'full_name',clean);
end;
$$;

revoke all on function public.cpcm_update_staff_display_name(text,text) from public,anon;
grant execute on function public.cpcm_update_staff_display_name(text,text) to authenticated;

create or replace function public.cpcm_staff_directory()
returns table(email text,role text,full_name text,approval_status text,is_approved boolean,is_active boolean,last_seen_at timestamptz,updated_at timestamptz,created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.email,u.role,u.full_name,u.approval_status,u.is_approved,u.is_active,u.last_seen_at,u.updated_at,u.created_at
  from public.app_users u
  where u.organization_id=private.current_organization_id()
    and lower(coalesce(u.role,'')) in ('admin','agency_admin','employee','collector')
    and coalesce(u.is_active,true) is not false
    and lower(coalesce(u.approval_status,'')) not in ('removed','rejected','fired')
  order by lower(u.email);
$$;

revoke all on function public.cpcm_staff_directory() from public,anon;
grant execute on function public.cpcm_staff_directory() to authenticated;
notify pgrst,'reload schema';
