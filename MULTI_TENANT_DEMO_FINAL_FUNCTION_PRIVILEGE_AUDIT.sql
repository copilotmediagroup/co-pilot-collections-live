\set ON_ERROR_STOP on
-- Read-only final function privilege sweep for tenant-sensitive helpers/RPCs.
DO $$
DECLARE bad text[];
BEGIN
 SELECT array_agg(n.nspname||'.'||p.proname ORDER BY n.nspname,p.proname) INTO bad
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE ((n.nspname='private' AND p.proname IN ('current_organization_id','is_platform_admin','is_organization_admin','assert_account_in_current_organization','stamp_current_organization'))
    OR (n.nspname='public' AND p.proname IN ('cpcm_record_call_attempt','cpcm_complete_call_attempt','cpcm_admin_client_portal_snapshot','cpcm_admin_save_client_portal_access','cpcm_admin_disable_client_portal_access','cpcm_client_portal_snapshot','cpcm_admin_manage_staff_user','cpcm_admin_remittance_snapshot','cpcm_admin_save_fee_schedule','cpcm_admin_preview_remittance','cpcm_admin_create_remittance_batch','cpcm_admin_update_remittance_batch','cpcm_remittance_batch_detail','cpcm_client_remittance_snapshot','cpcm_update_staff_display_name','cpcm_staff_directory','admin_clear_accounts','is_app_admin','is_approved_app_user','can_access_account','cpcm_current_is_client')))
   AND has_function_privilege('anon',p.oid,'EXECUTE');
 IF bad IS NOT NULL THEN RAISE EXCEPTION 'FINAL FUNCTION PRIVILEGE AUDIT FAIL: anon can execute %',array_to_string(bad,', '); END IF;
 RAISE NOTICE 'DEMO FINAL FUNCTION PRIVILEGE AUDIT PASSED: anon cannot execute audited tenant-sensitive helpers/RPCs.';
END $$;
