# Co Pilot Collections — Final Production Pre-Cutover Checklist

This checklist is subordinate to `PRODUCTION_CUTOVER_SEQUENCE.md`. It records the current production release contract; old DEMO completion state is not authorization for LIVE.

## Code preparation already green
- 48-file pre-cutover production foundation is isolated from tenant-fence, recruiting cutover, Phase 8, and subscription cutover stages.
- Foundation SQL is explicitly transactional and guarded by fail-closed pre/post structural checks.
- Recruiting remains platform-global and has separate pre-cutover compatibility, install, and post-cutover gates.
- Production tenant fence is separate, transactional, and requires all four restrictive policies: SELECT, INSERT, UPDATE, DELETE.
- Post-fence feature policies (Phase 14, Phase 25 account-role, Phase 49) are isolated behind the production tenant fence and independently verified.
- Agency A/B behavioral isolation proof is rollback-only and tests reciprocal cross-tenant SELECT/INSERT/UPDATE/DELETE denial, own-tenant access, tenant stamping, and Platform Admin control.
- Production writer audit verifies foundation SQL and Edge Function tenant writes carry/derive explicit tenant context before Phase 8 may remove legacy defaults.
- Phase 8 is isolated and its read-only post gate requires legacy defaults removed plus all four restrictive tenant policies on every present tenant table.
- Subscription release is isolated to phases 57-101, six subscription Edge Functions, three Vault-backed cron jobs, and controlled provider smoke tests.
- Application deployment remains after database/subscription cutover verification.

## LIVE execution order — explicit owner authorization required
1. Run `PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql` read-only against LIVE and stop on any mismatch or partial-foundation state.
2. Apply `MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql` and run `PRODUCTION_FOUNDATION_POST_INSTALL_PRE_PHASE8_GATE.sql`.
3. Run recruiting pre-cutover compatibility; only on PASS apply `PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql`, then run its post-cutover gate.
4. Apply `PRODUCTION_TENANT_FENCE_INSTALL.sql`, then run `PRODUCTION_TENANT_FENCE_POST_INSTALL_GATE.sql`.
5. Apply `PRODUCTION_POST_FENCE_POLICY_INSTALL.sql`, then run `PRODUCTION_POST_FENCE_POLICY_GATE.sql`.
6. Run `PRODUCTION_TENANT_ISOLATION_PROOF.sql`; it must PASS and ROLLBACK.
7. Run `scripts-production-writer-tenant-context-gate.mjs`; it must PASS before Phase 8.
8. Apply `PRODUCTION_PHASE8_CUTOVER_INSTALL.sql`, then run `PRODUCTION_PHASE8_POST_CUTOVER_GATE.sql`.
9. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql`.
10. Deploy the six production subscription Edge Functions and configure only server-side production secrets.
11. Install the three production subscription cron jobs using Vault-backed configuration.
12. Run controlled subscription smoke tests without duplicate provider mutation.
13. Build/deploy the LIVE application only after database and subscription gates are green.
14. Run post-deploy role/access, new-agency provisioning, onboarding, account workflow, messaging, reporting/remittance, and cross-tenant negative smoke tests.

## Mandatory stop rules
- Never skip or waive a failed gate.
- Never run the draft `MULTI_TENANT_PHASE2_TENANT_FENCE_DRAFT.sql` against LIVE; use the canonical production tenant-fence installer.
- Never run Phase 8 before tenant-fence structure, post-fence policy verification, rollback-only Agency A/B isolation, and production writer audit all pass.
- Never install subscription phases before the tenant cutover is verified.
- Never use DEMO/staging installers against LIVE.
- Never expose service-role, NMI private, lifecycle, or webhook-signing secrets to browser/runtime configuration.
- Never perform LIVE mutation, Edge Function/cron deployment, main merge, Netlify production deploy, or a real charge without explicit owner authorization.

## Current authorization state
Preparation may continue locally and on the feature branch. LIVE execution has **not** been authorized by a bare `Continue` instruction.
