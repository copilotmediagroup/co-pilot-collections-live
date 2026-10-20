\set ON_ERROR_STOP on
BEGIN;
-- PostgreSQL functions default EXECUTE to PUBLIC. Earlier scripts revoked from
-- public but not always from anon; explicitly close browser-anonymous access.
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_client_portal_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_disable_client_portal_access(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_client_portal_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_manage_staff_user(text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_remittance_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_preview_remittance(text,text,date,date,numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_admin_update_remittance_batch(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_remittance_batch_detail(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cpcm_client_remittance_snapshot() FROM PUBLIC, anon;

-- Preserve intended signed-in application access.
GRANT EXECUTE ON FUNCTION public.cpcm_admin_client_portal_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_save_client_portal_access(text,text,text,boolean,text[],boolean,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_disable_client_portal_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_client_portal_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_manage_staff_user(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_remittance_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_save_fee_schedule(text,text,numeric,numeric,numeric,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_preview_remittance(text,text,date,date,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_create_remittance_batch(text,text,date,date,numeric,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_admin_update_remittance_batch(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_remittance_batch_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cpcm_client_remittance_snapshot() TO authenticated;

DO $$
DECLARE bad text[];
BEGIN
 SELECT array_agg(p.proname ORDER BY p.proname) INTO bad
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
   AND p.proname = ANY(ARRAY['cpcm_admin_client_portal_snapshot','cpcm_admin_save_client_portal_access','cpcm_admin_disable_client_portal_access','cpcm_client_portal_snapshot','cpcm_admin_manage_staff_user','cpcm_admin_remittance_snapshot','cpcm_admin_save_fee_schedule','cpcm_admin_preview_remittance','cpcm_admin_create_remittance_batch','cpcm_admin_update_remittance_batch','cpcm_remittance_batch_detail','cpcm_client_remittance_snapshot'])
   AND has_function_privilege('anon',p.oid,'EXECUTE');
 IF bad IS NOT NULL THEN RAISE EXCEPTION 'RPC EXECUTE REPAIR FAILED: anon still has execute on %',array_to_string(bad,', '); END IF;
 RAISE NOTICE 'DEMO RPC EXECUTE REPAIR PASSED: anonymous execution removed; authenticated access preserved.';
END $$;
COMMIT;
