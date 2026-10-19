-- Co Pilot Collections — Phase 7: Agency A/B isolation assertions
-- STAGING/DISPOSABLE PROJECT ONLY. Execute after Phases 1-6 and Phase 2 tenant fences.
-- This file intentionally contains assertions, not production seed credentials.

-- PRECHECK: every tenant-scoped table that exists must have organization_id, RLS enabled,
-- and the four restrictive cpcm_tenant_* policies.
do $$
declare t text; missing text[]:=array[]::text[]; r record; begin
 foreach t in array array[
  'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises',
  'payments_ledger','account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions',
  'import_batches','company_settings','collector_alerts','compliance_events','client_portfolio_assignments',
  'client_fee_schedules','client_remittance_batches','client_remittance_items','nmi_transactions','payment_approval_requests',
  'nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence','ringcentral_call_records',
  'employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
  'voice_broadcast_calls','voice_broadcast_live_transfers','job_applications','recruiter_applications','recruiter_candidate_profiles',
  'ai_call_qa','ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts',
  'ai_conversation_events','ai_caller_id_config','ai_bland_pathway_config'
 ] loop
  if to_regclass('public.'||t) is not null then
   if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='organization_id') then missing:=array_append(missing,t||':organization_id'); end if;
   if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then missing:=array_append(missing,t||':rls'); end if;
   for r in select x from unnest(array['cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete']) x loop
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=r.x) then missing:=array_append(missing,t||':'||r.x); end if;
   end loop;
  end if;
 end loop;
 if cardinality(missing)>0 then raise exception 'TENANT PRECHECK FAILED: %',array_to_string(missing,', '); end if;
 raise notice 'TENANT PRECHECK PASSED';
end $$;

-- Test execution procedure:
-- A. Create two staging auth users and two organizations; give each user exactly one active organization_members row.
-- B. Sign in as Agency A through the normal client JWT. Insert A account/payment plan/message/document.
-- C. Sign in as Agency B and insert equivalent B records.
-- D. With A JWT, direct REST SELECT by each B primary key must return []. UPDATE/DELETE must affect 0 rows.
-- E. With A JWT, INSERT containing B organization_id must never create a B-owned row (trigger overwrites to A or RLS denies).
-- F. Repeat D/E for accounts, payments_ledger, payment_plans, team_messages, account_docs, AI attempts, campaigns, call records.
-- G. Verify existing intra-agency collector/client policies still restrict rows within Agency A.
-- H. Verify platform admin can inspect A and B only through explicit platform-admin membership/control.
-- I. Verify anon recruiter submission remains limited to intended insert surface and cannot read tenant data.
-- J. Remove temporary legacy organization_id defaults only after A-I pass.
