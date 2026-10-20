-- Phase 33: agency-admin management of employee/client join codes.
begin;
create or replace function public.cpcm_admin_create_join_code(p_role text default 'employee',p_expires_at timestamptz default null)
returns text language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); role_name text:=lower(trim(coalesce(p_role,'employee'))); new_code text;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 if role_name not in ('employee','client') then raise exception 'join code role must be employee or client'; end if;
 if p_expires_at is not null and p_expires_at<=now() then raise exception 'expiration must be in the future'; end if;
 new_code:=upper(substr(encode(gen_random_bytes(9),'hex'),1,12));
 insert into public.organization_join_codes(organization_id,code,allowed_role,is_active,expires_at,created_by) values(oid,new_code,role_name,true,p_expires_at,auth.uid());
 return new_code;
end $$;
create or replace function public.cpcm_admin_list_join_codes()
returns table(id uuid,code text,allowed_role text,is_active boolean,expires_at timestamptz,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select j.id,j.code,j.allowed_role,j.is_active,j.expires_at,j.created_at from public.organization_join_codes j where j.organization_id=private.current_organization_id() and private.is_organization_admin(j.organization_id) order by j.created_at desc;
$$;
create or replace function public.cpcm_admin_set_join_code_active(p_id uuid,p_is_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); n int;
begin
 if oid is null or not private.is_organization_admin(oid) then raise exception 'agency admin only'; end if;
 update public.organization_join_codes set is_active=p_is_active where id=p_id and organization_id=oid; get diagnostics n=row_count; if n<>1 then raise exception 'join code not found'; end if; return p_is_active;
end $$;
revoke all on function public.cpcm_admin_create_join_code(text,timestamptz) from public,anon;
revoke all on function public.cpcm_admin_list_join_codes() from public,anon;
revoke all on function public.cpcm_admin_set_join_code_active(uuid,boolean) from public,anon;
grant execute on function public.cpcm_admin_create_join_code(text,timestamptz) to authenticated;
grant execute on function public.cpcm_admin_list_join_codes() to authenticated;
grant execute on function public.cpcm_admin_set_join_code_active(uuid,boolean) to authenticated;
commit;
