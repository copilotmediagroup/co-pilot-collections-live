-- Phase 45: tenant-safe staff role changes; remove browser PATCH dependency for privileged role fields.
begin;
create or replace function public.cpcm_admin_set_staff_role(target_email text,new_role text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); target text:=lower(trim(coalesce(target_email,''))); role_name text:=lower(trim(coalesce(new_role,''))); uid uuid; out_row jsonb;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if target='' then raise exception 'target_email required'; end if;
 if role_name not in ('employee','recruiter') then raise exception 'unsupported staff role'; end if;
 select u.id into uid from auth.users u where lower(u.email)=target limit 1;
 if uid is null then raise exception 'staff auth user not found'; end if;
 if not exists(select 1 from public.organization_members m where m.organization_id=oid and m.auth_user_id=uid and m.is_active=true) then raise exception 'staff user is not an active member of this organization'; end if;
 update public.app_users set role=role_name,updated_at=now() where organization_id=oid and lower(email)=target and lower(coalesce(role,'employee')) not in ('admin','agency_admin','client');
 if not found then raise exception 'staff profile not found or protected role'; end if;
 update public.organization_members set role=role_name,updated_at=now() where organization_id=oid and auth_user_id=uid;
 select jsonb_build_object('ok',true,'email',email,'role',role) into out_row from public.app_users where organization_id=oid and lower(email)=target limit 1;
 return out_row;
end $$;
revoke all on function public.cpcm_admin_set_staff_role(text,text) from public,anon;
grant execute on function public.cpcm_admin_set_staff_role(text,text) to authenticated;
commit;
