-- Phase 44: prevent self-service app_users updates from becoming role/approval escalation.
begin;
create or replace function private.guard_app_user_privilege_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if private.is_platform_admin() or private.is_organization_admin(old.organization_id) then return new; end if;
 if old.organization_id is distinct from new.organization_id or lower(coalesce(old.email,'')) is distinct from lower(coalesce(new.email,'')) or lower(coalesce(old.role,'')) is distinct from lower(coalesce(new.role,'')) or old.is_approved is distinct from new.is_approved or old.is_active is distinct from new.is_active or lower(coalesce(old.approval_status,'')) is distinct from lower(coalesce(new.approval_status,'')) or old.client_portal_enabled is distinct from new.client_portal_enabled then
  raise exception 'Profile privilege fields may only be changed by an organization administrator' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.guard_app_user_privilege_update() from public,anon,authenticated;
do $$ begin
 if to_regclass('public.app_users') is not null then
  drop trigger if exists cpcm_guard_app_user_privilege_update on public.app_users;
  create trigger cpcm_guard_app_user_privilege_update before update on public.app_users for each row execute function private.guard_app_user_privilege_update();
 end if;
end $$;
commit;
