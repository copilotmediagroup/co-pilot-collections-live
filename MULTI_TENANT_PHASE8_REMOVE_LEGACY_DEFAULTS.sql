-- Co Pilot Collections — Phase 8 cutover cleanup
-- DO NOT RUN until Phase 7 Agency A/B isolation tests pass and all production writers are tenant-aware.
begin;
do $$ declare t text; begin
 foreach t in array array[
  'app_users','accounts','account_notes','activity_logs','payment_plans','payment_plan_payments','payment_promises','payments_ledger',
  'account_docs','call_results','follow_ups','disputes','settlements','audit_logs','role_permissions','import_batches','company_settings',
  'collector_alerts','compliance_events','client_portfolio_assignments','client_fee_schedules','client_remittance_batches','client_remittance_items',
  'nmi_transactions','payment_approval_requests','nmi_plan_allocations','nmi_webhook_events','team_messages','team_typing_status','team_presence',
  'ringcentral_call_records','employee_commission_earnings','voice_broadcast_settings','voice_broadcast_campaigns','voice_broadcast_campaign_accounts',
  'voice_broadcast_calls','voice_broadcast_live_transfers','ai_call_qa',
  'ai_collector_script_profiles','account_communication_compliance','ai_call_runtime_config','ai_real_call_attempts','ai_conversation_events',
  'ai_caller_id_config','ai_bland_pathway_config'
 ] loop
  if to_regclass('public.'||t) is not null then execute format('alter table public.%I alter column organization_id drop default',t); end if;
 end loop;
end $$;
commit;
