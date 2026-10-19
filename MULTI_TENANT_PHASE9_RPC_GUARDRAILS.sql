-- Co Pilot Collections — Phase 9: RPC tenant guardrails
-- NON-PRODUCTION FIRST. RLS remains the primary boundary; these guards make tenant intent explicit.
begin;

create or replace function private.assert_account_in_current_organization(p_account_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_org uuid; v_current uuid;
begin
 if private.is_platform_admin() then
  select organization_id into v_org from public.accounts where id=p_account_id;
  if v_org is null then raise exception 'Account not found'; end if;
  return v_org;
 end if;
 v_current:=private.current_organization_id();
 if v_current is null then raise exception 'Active organization membership required' using errcode='42501'; end if;
 select organization_id into v_org from public.accounts where id=p_account_id and organization_id=v_current;
 if v_org is null then raise exception 'Account not found in current organization' using errcode='42501'; end if;
 return v_org;
end $$;
revoke all on function private.assert_account_in_current_organization(uuid) from public;
grant execute on function private.assert_account_in_current_organization(uuid) to authenticated;

-- Tenant-safe phone lookup. SECURITY INVOKER means existing account RLS still applies.
create or replace function public.cpcm_accounts_by_phone(p_phone text)
returns table(id uuid,full_name text,account_number text,current_balance numeric,original_creditor text,portfolio text,status text)
language sql stable security invoker set search_path=public as $$
 select a.id,a.full_name,a.account_number,a.current_balance,a.original_creditor,a.portfolio,a.status
 from public.accounts a
 where (private.is_platform_admin() or a.organization_id=private.current_organization_id())
 and length(regexp_replace(coalesce(p_phone,''),'\D','','g'))>=10
 and right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10) in (
  right(regexp_replace(coalesce(a.phone1,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone2,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone3,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone4,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone5,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone6,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone7,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone8,''),'\D','','g'),10),
  right(regexp_replace(coalesce(a.phone9,''),'\D','','g'),10),right(regexp_replace(coalesce(a.phone10,''),'\D','','g'),10))
 limit 20;
$$;
revoke all on function public.cpcm_accounts_by_phone(text) from public,anon;
grant execute on function public.cpcm_accounts_by_phone(text) to authenticated;

commit;

-- REQUIRED RPC AUDIT RULE:
-- Every authenticated RPC that accepts an account id must either be SECURITY INVOKER over tenant-fenced tables
-- or call private.assert_account_in_current_organization(target_account_id) before mutation.
-- Every SECURITY DEFINER RPC must derive tenant from auth.uid()/organization_members or a trusted stored record;
-- never accept organization_id from the browser as authority.
