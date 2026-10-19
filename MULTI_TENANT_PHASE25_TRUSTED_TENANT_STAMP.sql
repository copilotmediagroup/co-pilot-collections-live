-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 25
-- Permit trusted backend/migration roles to write an explicitly supplied tenant while keeping browser writes stamped.
begin;
create or replace function private.stamp_current_organization()
returns trigger language plpgsql set search_path='' as $cpcm$
declare current_org uuid;
begin
  if current_user in ('postgres','service_role','supabase_admin') then
    if new.organization_id is null then raise exception 'Trusted tenant write requires organization_id' using errcode='23502'; end if;
    return new;
  end if;
  if private.is_platform_admin() then return new; end if;
  current_org:=private.current_organization_id();
  if current_org is null then raise exception 'No active organization membership for authenticated user' using errcode='42501'; end if;
  new.organization_id:=current_org;
  return new;
end $cpcm$;
revoke all on function private.stamp_current_organization() from public;
grant execute on function private.stamp_current_organization() to authenticated,service_role;
commit;
