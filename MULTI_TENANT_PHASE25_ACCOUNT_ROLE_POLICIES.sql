-- Co Pilot Collections — Multi-Tenant SaaS Conversion, Phase 25
-- Restore tenant-safe account role paths after legacy owner-email policy cleanup.
-- Phase 2 cpcm_tenant_* RESTRICTIVE policies remain the cross-tenant boundary.
begin;

-- Collector/employee path: approved active app user may read/update only an
-- account assigned to their own email. Agency/platform admins have their
-- separate cpcm_org_admin_access permissive policy.
drop policy if exists cpcm_account_collector_select on public.accounts;
create policy cpcm_account_collector_select
on public.accounts as permissive for select to authenticated
using (
  public.is_approved_app_user()
  and not public.cpcm_current_is_client()
  and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
);

drop policy if exists cpcm_account_collector_update on public.accounts;
create policy cpcm_account_collector_update
on public.accounts as permissive for update to authenticated
using (
  public.is_approved_app_user()
  and not public.cpcm_current_is_client()
  and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
)
with check (
  public.is_approved_app_user()
  and not public.cpcm_current_is_client()
  and lower(coalesce(assigned_to_email,'')) = public.current_app_email()
);

-- A client must be able to read its own portfolio-assignment rows so the
-- restrictive account policy can evaluate that relationship under RLS.
drop policy if exists cpcm_client_portfolio_assignment_select on public.client_portfolio_assignments;
create policy cpcm_client_portfolio_assignment_select
on public.client_portfolio_assignments as permissive for select to authenticated
using (
  organization_id = private.current_organization_id()
  and lower(client_email) = public.current_app_email()
);

-- Client read path: a client may read only accounts in a portfolio explicitly
-- assigned to that client inside the current organization. Client write-deny
-- restrictive policies remain authoritative for INSERT/UPDATE/DELETE.
drop policy if exists cpcm_account_client_portfolio_select on public.accounts;
create policy cpcm_account_client_portfolio_select
on public.accounts as permissive for select to authenticated
using (
  public.cpcm_current_is_client()
  and organization_id = private.current_organization_id()
  and exists (
    select 1
    from public.client_portfolio_assignments c
    where c.organization_id = accounts.organization_id
      and lower(c.client_email) = public.current_app_email()
      and lower(trim(c.portfolio_name)) = lower(trim(coalesce(accounts.portfolio,'')))
  )
);

commit;
