-- Phase 52: enforce app profile and auth membership role consistency for active tenant identities.
begin;
create or replace function private.guard_app_user_membership_role_consistency()
returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid; member_role text; expected_role text:=lower(coalesce(new.role,'employee'));
begin
 select u.id into uid from auth.users u where lower(u.email::text)=lower(new.email) limit 1;
 if uid is null then return new; end if;
 select lower(m.role) into member_role from public.organization_members m where m.organization_id=new.organization_id and m.auth_user_id=uid limit 1;
 if member_role is null then return new; end if;
 if expected_role='admin' then expected_role:='agency_admin'; end if;
 if expected_role='collector' then expected_role:='employee'; end if;
 if member_role<>expected_role then raise exception 'Profile role does not match organization membership role' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function private.guard_app_user_membership_role_consistency() from public,anon,authenticated;
do $$ begin
 if to_regclass('public.app_users') is not null then
  drop trigger if exists cpcm_guard_app_user_membership_role_consistency on public.app_users;
  create constraint trigger cpcm_guard_app_user_membership_role_consistency after insert or update of role,organization_id,email on public.app_users deferrable initially deferred for each row execute function private.guard_app_user_membership_role_consistency();
 end if;
end $$;
commit;
