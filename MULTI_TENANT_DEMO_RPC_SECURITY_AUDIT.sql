\set ON_ERROR_STOP on
-- Read-only post-cutover audit of high-impact SECURITY DEFINER RPC ownership and EXECUTE grants.
\echo '--- CPCM DEMO high-impact RPC security audit ---'
DO $$
DECLARE bad text[];
BEGIN
  -- NMI finalizers must never be callable by browser roles.
  SELECT array_agg(p.proname ORDER BY p.proname) INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('cpcm_nmi_finalize_sale','cpcm_nmi_apply_adjustment')
    AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'));
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'RPC SECURITY AUDIT FAIL: browser role can execute service-only NMI RPC(s): %',array_to_string(bad,', '); END IF;

  -- High-impact definer RPCs exposed to authenticated must contain explicit tenant/admin/client guards.
  SELECT array_agg(p.proname ORDER BY p.proname) INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname = ANY(ARRAY['cpcm_admin_client_portal_snapshot','cpcm_admin_save_client_portal_access','cpcm_admin_disable_client_portal_access','cpcm_client_portal_snapshot','cpcm_admin_manage_staff_user','cpcm_admin_remittance_snapshot','cpcm_admin_save_fee_schedule','cpcm_admin_preview_remittance','cpcm_admin_create_remittance_batch','cpcm_admin_update_remittance_batch','cpcm_remittance_batch_detail','cpcm_client_remittance_snapshot','cpcm_update_staff_display_name','cpcm_staff_directory','admin_clear_accounts'])
    AND p.prosecdef
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND pg_get_functiondef(p.oid) !~* '(current_organization_id|organization_id)';
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'RPC SECURITY AUDIT FAIL: authenticated SECURITY DEFINER RPC lacks visible tenant binding: %',array_to_string(bad,', '); END IF;

  -- No high-impact authenticated definer RPC may also remain executable by anon.
  SELECT array_agg(p.proname ORDER BY p.proname) INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname = ANY(ARRAY['cpcm_admin_client_portal_snapshot','cpcm_admin_save_client_portal_access','cpcm_admin_disable_client_portal_access','cpcm_client_portal_snapshot','cpcm_admin_manage_staff_user','cpcm_admin_remittance_snapshot','cpcm_admin_save_fee_schedule','cpcm_admin_preview_remittance','cpcm_admin_create_remittance_batch','cpcm_admin_update_remittance_batch','cpcm_remittance_batch_detail','cpcm_client_remittance_snapshot','cpcm_update_staff_display_name','cpcm_staff_directory','admin_clear_accounts'])
    AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'RPC SECURITY AUDIT FAIL: anon can execute high-impact definer RPC(s): %',array_to_string(bad,', '); END IF;

  RAISE NOTICE 'DEMO RPC SECURITY AUDIT PASSED: service-only NMI finalizers are browser-inaccessible and audited authenticated definer RPCs are tenant-bound/non-anon.';
END $$;
