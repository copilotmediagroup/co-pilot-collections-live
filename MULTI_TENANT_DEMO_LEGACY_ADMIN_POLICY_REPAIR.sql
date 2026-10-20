\set ON_ERROR_STOP on
BEGIN;
-- DEMO-only repair for legacy permissive admin policies found by the broad audit.
-- The restrictive cpcm_tenant_* fence remains the outer tenant boundary; these
-- permissive policies now grant the feature only to platform/current-org admins.

DROP POLICY IF EXISTS app_users_update_admin_display_names ON public.app_users;
CREATE POLICY app_users_update_admin_display_names ON public.app_users
AS PERMISSIVE FOR UPDATE TO authenticated
USING (private.is_platform_admin() OR private.is_organization_admin(organization_id))
WITH CHECK (private.is_platform_admin() OR private.is_organization_admin(organization_id));

DROP POLICY IF EXISTS account_notes_delete_admin_all_notes ON public.account_notes;
CREATE POLICY account_notes_delete_admin_all_notes ON public.account_notes
AS PERMISSIVE FOR DELETE TO authenticated
USING (private.is_platform_admin() OR private.is_organization_admin(organization_id));

DROP POLICY IF EXISTS account_notes_delete_admin_signed_notes ON public.account_notes;
CREATE POLICY account_notes_delete_admin_signed_notes ON public.account_notes
AS PERMISSIVE FOR DELETE TO authenticated
USING (private.is_platform_admin() OR private.is_organization_admin(organization_id));

DROP POLICY IF EXISTS activity_logs_delete_admin_note_entries ON public.activity_logs;
CREATE POLICY activity_logs_delete_admin_note_entries ON public.activity_logs
AS PERMISSIVE FOR DELETE TO authenticated
USING (private.is_platform_admin() OR private.is_organization_admin(organization_id));

DO $$
DECLARE bad text[];
BEGIN
 SELECT array_agg(tablename||'.'||policyname ORDER BY tablename,policyname) INTO bad
 FROM pg_policies
 WHERE schemaname='public'
   AND policyname IN ('app_users_update_admin_display_names','account_notes_delete_admin_all_notes','account_notes_delete_admin_signed_notes','activity_logs_delete_admin_note_entries')
   AND (coalesce(qual,'') ~* '(afinch2678@gmail\\.com|demo-admin@|demo-employee@)' OR coalesce(with_check,'') ~* '(afinch2678@gmail\\.com|demo-admin@|demo-employee@|^\\s*true\\s*$)');
 IF bad IS NOT NULL THEN RAISE EXCEPTION 'LEGACY ADMIN POLICY REPAIR FAILED: %',array_to_string(bad,', '); END IF;
 RAISE NOTICE 'DEMO LEGACY ADMIN POLICY REPAIR PASSED';
END $$;
COMMIT;
