\set ON_ERROR_STOP on
-- LIVE post-tenant-fence feature-policy stage.
-- Run only AFTER PRODUCTION_TENANT_FENCE_POST_INSTALL_GATE.sql passes.
-- These permissive feature policies intentionally rely on the restrictive cpcm_tenant_* fence.
\echo 'Installing post-fence feature policies; restrictive tenant fence must already be present.'
\ir MULTI_TENANT_PHASE14_LEGACY_POLICY_CLEANUP.sql
\ir MULTI_TENANT_PHASE25_ACCOUNT_ROLE_POLICIES.sql
\ir MULTI_TENANT_PHASE49_CANONICAL_ACTOR_IDENTITY.sql
