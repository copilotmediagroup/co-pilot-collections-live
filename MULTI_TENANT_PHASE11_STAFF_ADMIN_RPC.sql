-- Phase 11: tenant-safe staff administration override. NON-PRODUCTION FIRST.
create or replace function public.cpcm_admin_manage_staff_user(
  target_email text,
  requested_action text,
  removal_reason_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor text:=lower(coalesce(auth.jwt()->>'email',''));
  oid uuid:=private.current_organization_id();
  target text:=lower(trim(coalesce(target_email,'')));
  action_name text:=lower(trim(coalesce(requested_action,'')));
  target_role text;
  released_count integer:=0;
  result jsonb;
begin
  if not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
  if target='' then raise exception 'target_email required'; end if;
  if target=actor then raise exception 'protected admin account cannot be changed'; end if;

  select lower(coalesce(role,'employee')) into target_role
  from public.app_users where organization_id=oid and lower(email)=target limit 1;
  if not found then raise exception 'user not found'; end if;

  if action_name='approved' then
    update public.app_users set
      approval_status='approved',is_approved=true,is_active=true,
      client_portal_enabled=case when target_role='client' then true else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='pending' then
    update public.app_users set
      approval_status='pending',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='rejected' then
    update public.app_users set
      approval_status='rejected',is_approved=false,is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      removed_at=null,removed_by_email=null,removal_reason=null,updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='activate' then
    update public.app_users set
      is_active=true,
      client_portal_enabled=case when target_role='client' and coalesce(is_approved,false) then true else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='deactivate' then
    update public.app_users set
      is_active=false,
      client_portal_enabled=case when target_role='client' then false else client_portal_enabled end,
      updated_at=now()
    where organization_id=oid and lower(email)=target;
  elsif action_name='remove' then
    update public.app_users set
      approval_status='removed',is_approved=false,is_active=false,client_portal_enabled=false,
      removed_at=now(),removed_by_email=actor,removal_reason=coalesce(nullif(trim(removal_reason_text),''),'Fired / removed'),updated_at=now()
    where organization_id=oid and lower(email)=target;

    update public.accounts set
      assigned_to_email=null,assigned_by_email=actor,assigned_at=null,
      assignment_method='employee_removed',assignment_group_id=null,updated_at=now()
    where organization_id=oid and lower(coalesce(assigned_to_email,''))=target;
    get diagnostics released_count=row_count;
  else
    raise exception 'unsupported action: %',action_name;
  end if;

  select jsonb_build_object(
    'ok',true,'email',email,'role',role,'approval_status',approval_status,
    'is_approved',is_approved,'is_active',is_active,
    'client_portal_enabled',client_portal_enabled,
    'assigned_accounts_released',released_count
  ) into result from public.app_users where organization_id=oid and lower(email)=target limit 1;
  return result;
end;
$$;

revoke all on function public.cpcm_admin_manage_staff_user(text,text,text) from public,anon;
grant execute on function public.cpcm_admin_manage_staff_user(text,text,text) to authenticated;
notify pgrst,'reload schema';
