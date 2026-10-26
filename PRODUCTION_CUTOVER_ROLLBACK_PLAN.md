# Co Pilot Collections — Production Cutover Rollback Plan

This plan accompanies `PRODUCTION_CUTOVER_SEQUENCE.md`. It does not authorize any LIVE mutation. Every LIVE rollback or forward-fix action requires explicit owner authorization.

## Core rule
A failed gate stops the cutover. Do not continue to the next stage. Prefer a forward fix when the failed stage has already committed schema/data changes and reversal could destroy valid production data.

## Before the first LIVE mutation
- Record the LIVE project reference and current application deploy identifier without exposing credentials.
- Record the feature-branch commit SHA being released.
- Take/verify a provider-supported database backup or recovery point appropriate for the LIVE project.
- Run `PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql` read-only and retain the result.
- Confirm no Demo/staging installer is in the LIVE command sequence.
- Confirm the canonical release commit is clean and all static gates pass.

If any item is unavailable, stop before Stage A.

## Stage A — Foundation / recruiting
The foundation installer is composed of transactional phase files, but the stage contains multiple committed transactions. If a post-install gate fails after one or more phase files committed:
- STOP; do not run tenant fence, Phase 8, or subscriptions.
- Capture the exact failing phase/gate and database error.
- Do not blindly rerun the entire installer or manually drop new objects.
- Reconcile the partial state and prepare an idempotent forward fix, then rerun the read-only post-install gate.

Recruiting cutover is isolated. If its post gate fails, stop before Stage B and repair recruiting independently.

## Stage B — Tenant fence / post-fence policies / isolation proof
`PRODUCTION_TENANT_FENCE_INSTALL.sql` and the post-fence policy installer are transactional artifacts. If either installer fails before COMMIT, PostgreSQL rollback is the rollback path. If its transaction commits but a following read-only gate fails:
- STOP before Phase 8.
- Do not remove tenant fences to restore availability unless an explicitly reviewed emergency rollback requires it.
- Prefer correcting the failed policy/trigger state while retaining restrictive isolation.
- Rerun the structural gate and rollback-only Agency A/B isolation proof.

The isolation proof itself ends in `ROLLBACK`; a proof failure must never be bypassed.

## Stage C — Phase 8 default removal
Phase 8 is allowed only after behavioral isolation and writer audit pass. If the Phase 8 installer transaction fails, PostgreSQL rollback is the rollback path. If Phase 8 commits but its read-only post gate fails:
- STOP before subscriptions.
- Do not improvise tenant defaults. Determine the exact table/default mismatch.
- Restore a legacy organization default only through an explicitly reviewed repair if required; otherwise forward-fix the mismatch and rerun the gate.
- Rerun the writer audit and tenant isolation proof before continuing.

## Stage D — Subscription database / Edge Functions / cron
If subscription SQL fails before its transaction commits, stop and reconcile that phase. If database phases are green but an Edge Function deployment fails:
- Do not install/enable cron jobs that call an incomplete function set.
- Keep application release held.
- Redeploy the failed function from the pinned release commit and rerun release-manifest/readiness gates.

If cron installation fails, leave the application release held until all three jobs and Vault-backed configuration are verified.

If a controlled provider smoke test creates a provider-side subscription and local finalization fails, use the durable recovery path; do not issue a duplicate provider mutation.

## Stage E — Application deployment
Before app deployment, retain the prior known-good deploy identifier. If the new app deploy fails post-deploy smoke while the database cutover is healthy:
- Roll the application back to the prior known-good deploy when compatible with the new database schema.
- If the old app is not compatible with the new schema, keep the new deployment held and forward-fix; do not restore old code blindly.
- Never roll back database tenant isolation merely to accommodate old frontend behavior.

## Emergency stop conditions
Immediately stop on any of these:
- cross-tenant read/write visibility;
- tenant resolution to the wrong organization;
- platform-admin control failure;
- unexpected browser access to service-only subscription operations;
- duplicate provider mutation risk;
- missing production secret/Vault dependency;
- any gate failure or ambiguous partial migration state.

## Evidence to retain
For each authorized LIVE stage, record: release commit SHA, UTC start/end time, operator, artifact executed/deployed, gate result, and any provider/deploy reference that is safe to record. Never store passwords, service-role keys, NMI private keys, lifecycle secrets, webhook signing keys, or raw payment data in the release log.
