# Co Pilot Collections — Production Release Evidence Log

Use this only during an explicitly authorized LIVE cutover. Do not place credentials, private/service keys, payment tokens, raw payment data, or database passwords in this file.

## Release header
- Release commit SHA:
- LIVE project reference:
- Prior known-good application deploy identifier:
- Database recovery point / backup reference:
- Operator:
- UTC start:
- UTC end:
- Final disposition: NOT STARTED / STOPPED / COMPLETED / ROLLED BACK / FORWARD FIX REQUIRED

## Stage 0 — Pre-mutation compatibility
- Artifact: `PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql`
- UTC start/end:
- Result: NOT RUN / PASS / FAIL
- Safe evidence/reference:
- Stop/reconciliation notes:

## Stage A — Foundation / recruiting
- Foundation artifact: `MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql`
- Foundation result: NOT RUN / PASS / FAIL
- Foundation post gate: `PRODUCTION_FOUNDATION_POST_INSTALL_PRE_PHASE8_GATE.sql`
- Foundation post-gate result: NOT RUN / PASS / FAIL
- Recruiting pre gate: `PRODUCTION_RECRUITING_PRE_CUTOVER_GATE.sql`
- Recruiting installer: `PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql`
- Recruiting post gate: `PRODUCTION_RECRUITING_POST_CUTOVER_GATE.sql`
- Recruiting result: NOT RUN / PASS / FAIL / NOT APPLICABLE
- UTC start/end:
- Safe evidence/reference:
- Stop/reconciliation notes:

## Stage B — Tenant boundary
- Tenant fence installer: `PRODUCTION_TENANT_FENCE_INSTALL.sql`
- Tenant fence gate: `PRODUCTION_TENANT_FENCE_POST_INSTALL_GATE.sql`
- Post-fence installer: `PRODUCTION_POST_FENCE_POLICY_INSTALL.sql`
- Post-fence gate: `PRODUCTION_POST_FENCE_POLICY_GATE.sql`
- Behavioral proof: `PRODUCTION_TENANT_ISOLATION_PROOF.sql`
- Writer audit: `scripts-production-writer-tenant-context-gate.mjs`
- Result: NOT RUN / PASS / FAIL
- UTC start/end:
- Safe evidence/reference:
- Stop/reconciliation notes:

## Stage C — Phase 8
- Installer: `PRODUCTION_PHASE8_CUTOVER_INSTALL.sql`
- Post gate: `PRODUCTION_PHASE8_POST_CUTOVER_GATE.sql`
- Result: NOT RUN / PASS / FAIL
- UTC start/end:
- Safe evidence/reference:
- Stop/reconciliation notes:

## Stage D — SaaS subscriptions
- Database installer: `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql`
- Six Edge Functions deployed from release SHA: YES / NO
- Server-side secrets verified without recording values: YES / NO
- Three Vault-backed cron jobs installed/verified: YES / NO
- Controlled provider smoke tests: NOT RUN / PASS / FAIL
- Duplicate provider mutation observed: YES / NO
- UTC start/end:
- Safe provider/event/deploy references:
- Stop/reconciliation notes:

## Stage E — Application release
- Runtime mode verified LIVE: YES / NO
- Application deploy identifier:
- Role/access smoke: NOT RUN / PASS / FAIL
- New-agency provisioning smoke: NOT RUN / PASS / FAIL
- Onboarding/account workflow smoke: NOT RUN / PASS / FAIL
- Messaging/reporting/remittance smoke: NOT RUN / PASS / FAIL
- Cross-tenant negative smoke: NOT RUN / PASS / FAIL
- UTC start/end:
- Stop/rollback notes:

## Final sign-off
- All mandatory gates passed: YES / NO
- Any unresolved partial migration state: YES / NO
- Any cross-tenant visibility observed: YES / NO
- Any duplicate provider mutation risk: YES / NO
- Final application deploy identifier:
- Final release commit SHA:
- Operator sign-off:
