\set ON_ERROR_STOP on
-- Platform-global recruiting cutover. Never chain into the pre-cutover foundation installer.
-- Required: PRODUCTION_RECRUITING_PRE_CUTOVER_GATE.sql passed against the same LIVE schema.
\ir MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql
