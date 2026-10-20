-- Phase 36: remove deployment-specific owner email from the reusable SaaS foundation.
-- Platform admins must be granted explicitly by auth UUID through controlled setup/provisioning.
begin;
-- No delete is performed: existing trusted platform_admin rows remain intact.
-- This migration exists to make the reusable foundation identity-neutral.
commit;
