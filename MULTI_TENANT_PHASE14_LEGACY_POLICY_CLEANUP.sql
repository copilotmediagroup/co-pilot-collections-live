-- Phase 14: remove legacy single-company authorization policies after Phase 2 tenant fences exist.
-- NON-PRODUCTION FIRST. Restrictive cpcm_tenant_* policies remain the cross-tenant boundary.
begin;

-- AI surfaces: agency admins manage only rows already fenced to their organization.
do $$ declare r record; begin
 for r in select * from (values
 ('ai_call_qa','ai_call_qa_admin_insert'),('ai_call_qa','ai_call_qa_admin_select'),('ai_call_qa','ai_call_qa_admin_update'),
 ('ai_collector_script_profiles','ai_script_admin_select'),('ai_collector_script_profiles','ai_script_admin_write'),
 ('account_communication_compliance','account_comm_compliance_admin_select'),('account_communication_compliance','account_comm_compliance_admin_write'),
 ('ai_call_runtime_config','ai_runtime_admin_select'),('ai_real_call_attempts','ai_real_attempt_admin_select'),
 ('ai_caller_id_config','ai_caller_id_admin_select'),('ai_caller_id_config','ai_caller_id_admin_write'),
 ('ai_bland_pathway_config','ai_bland_pathway_admin_select'),('ai_bland_pathway_config','ai_bland_pathway_admin_write'),
 ('ai_conversation_events','ai_conversation_events_admin_select')
 ) x(tbl,pol) loop
  if to_regclass('public.'||r.tbl) is not null then execute format('drop policy if exists %I on public.%I',r.pol,r.tbl); end if;
 end loop;
end $$;

-- Explicit agency-admin policies. These are permissive feature policies; Phase 2 restrictive tenant policies
-- still require organization_id=current organization for every row.
do $$ declare t text; begin
 foreach t in array array['ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_caller_id_config','ai_bland_pathway_config','ai_conversation_events'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy %I on public.%I for select to authenticated using (private.is_organization_admin(organization_id) or private.is_platform_admin())','cpcm_agency_admin_select',t);
  end if;
 end loop;
 foreach t in array array['ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_caller_id_config','ai_bland_pathway_config'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy %I on public.%I for all to authenticated using (private.is_organization_admin(organization_id) or private.is_platform_admin()) with check (private.is_organization_admin(organization_id) or private.is_platform_admin())','cpcm_agency_admin_write',t);
  end if;
 end loop;
end $$;

-- Commission legacy feature policy: keep employee self-view and agency-admin view, tenant fence still applies.
drop policy if exists employee_commission_select_own_or_admin on public.employee_commission_earnings;
create policy employee_commission_select_own_or_admin on public.employee_commission_earnings for select to authenticated
using(lower(employee_email)=lower(coalesce(auth.jwt()->>'email','')) or private.is_organization_admin(organization_id) or private.is_platform_admin());

commit;
