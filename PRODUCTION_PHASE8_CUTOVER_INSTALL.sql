\set ON_ERROR_STOP on
-- LIVE Phase 8 cutover wrapper.
-- NEVER run this as part of the foundation installer.
-- Required before execution:
--   1) production foundation post-install gate passed;
--   2) Phase 2 tenant fences installed and structurally verified;
--   3) Agency A/B behavioral isolation proof passed for SELECT/INSERT/UPDATE/DELETE;
--   4) collector/client intra-tenant access still works;
--   5) platform-admin cross-tenant control is verified;
--   6) all production writers explicitly carry/derive tenant context;
--   7) explicit owner authorization for LIVE cutover.
\echo 'LIVE PHASE 8 CUTOVER: removing legacy organization_id defaults.'
\ir MULTI_TENANT_PHASE8_REMOVE_LEGACY_DEFAULTS.sql
