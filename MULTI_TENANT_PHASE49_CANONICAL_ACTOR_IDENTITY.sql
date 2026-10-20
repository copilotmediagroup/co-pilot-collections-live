-- Phase 49: replace authorization/audit email claim reads with canonical auth-user identity.
begin;
-- Commission self-view must not trust a mutable JWT email claim.
drop policy if exists employee_commission_select_own_or_admin on public.employee_commission_earnings;
create policy employee_commission_select_own_or_admin on public.employee_commission_earnings for select to authenticated
using(lower(employee_email)=public.current_app_email() or private.is_organization_admin(organization_id) or private.is_platform_admin());

-- Existing tenant RPCs may continue to record an actor email, but derive it from auth.users.
-- Replacing auth.jwt email expressions in installed definitions is handled by recreating the source functions
-- through the canonical phase files below; this migration protects the RLS authorization path immediately.
commit;
