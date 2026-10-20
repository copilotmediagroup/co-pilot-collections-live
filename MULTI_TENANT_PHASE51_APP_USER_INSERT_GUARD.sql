-- Phase 51: prevent direct browser inserts from choosing privileged app_users fields.
begin;
create or replace function private.guard_app_user_privilege_insert()
returns trigger language plpgsql security definer set search_path='' as $$
declare oid uuid:=private.current_organization_id(); canonical_email text;
begin
 if private.is_platform_admin() or (oid is not null and private.is_organization_admin(oid)) then return new; end if;
 if oid is null or new.organization_id is distinct from oid then raise exception 'Profile organization must match authenticated organization' using errcode='42501'; end if;
 select lower(coalesce(u.email::text,'')) into canonical_email from auth.users u where u.id=auth.uid();
 if canonical_email='' or lower(coalesce(new.email,''))<>canonical_email then raise exception 'Profile email must match authenticated user' using errcode='42501'; end if;
 if lower(coalesce(new.role,''))<>'employee' or coalesce(new.is_approved,false) or coalesce(new.is_active,false) or lower(coalesce(new.approval_status,''))<>'pending' or coalesce(new.client_portal_enabled,false) then raise exception 'Direct profile insert may not set privileged fields' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.guard_app_user_privilege_insert() from public,anon,authenticated;
do $$ begin
 if to_regclass('public.app_users') is not null then
  drop trigger if exists cpcm_guard_app_user_privilege_insert on public.app_users;
  create trigger cpcm_guard_app_user_privilege_insert before insert on public.app_users for each row execute function private.guard_app_user_privilege_insert();
 end if;
end $$;
commit;
