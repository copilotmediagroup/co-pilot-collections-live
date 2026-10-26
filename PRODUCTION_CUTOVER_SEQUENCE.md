# Co Pilot Collections — Production Cutover Sequence

This is the canonical LIVE release order. Preparation and verification may be committed to the feature branch without changing LIVE. Every LIVE mutation/deployment step requires explicit owner authorization.

Rollback/recovery companion: `PRODUCTION_CUTOVER_ROLLBACK_PLAN.md`. Verify its pre-mutation recovery-point requirements before Stage A.
Release evidence template: `PRODUCTION_RELEASE_EVIDENCE_TEMPLATE.md`. Use it for every authorized LIVE stage without recording secrets or payment data.

## Stage 0 — Pre-mutation compatibility
1. Run `PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql` read-only against LIVE.
2. Stop on any prerequisite or partial-foundation failure. Reconcile before continuing.

## Stage A — Multi-tenant foundation
3. Apply `MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql` (48 transactional SQL files).
4. Run `PRODUCTION_FOUNDATION_POST_INSTALL_PRE_PHASE8_GATE.sql` read-only.
5. Run `PRODUCTION_RECRUITING_PRE_CUTOVER_GATE.sql` read-only. Only if it passes, apply `PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql`, then run `PRODUCTION_RECRUITING_POST_CUTOVER_GATE.sql` read-only.

## Stage B — Restrictive tenant boundary
6. Apply `PRODUCTION_TENANT_FENCE_INSTALL.sql`.
7. Run `PRODUCTION_TENANT_FENCE_POST_INSTALL_GATE.sql` read-only.
8. Apply `PRODUCTION_POST_FENCE_POLICY_INSTALL.sql` for Phase 14, Phase 25 account-role policies, and Phase 49.
9. Run `PRODUCTION_POST_FENCE_POLICY_GATE.sql` read-only.
10. Run `PRODUCTION_TENANT_ISOLATION_PROOF.sql`. This proof is rollback-only and must pass reciprocal Agency A/B isolation, tenant stamping, own-row access, and platform-admin control.
11. Run `node scripts-production-writer-tenant-context-gate.mjs`. It must prove production foundation SQL and Edge Function writes explicitly carry or derive tenant context before defaults are removed.

## Stage C — Remove legacy tenant defaults
12. Only after Stage B proof and writer audit pass, apply `PRODUCTION_PHASE8_CUTOVER_INSTALL.sql`.
13. Run `PRODUCTION_PHASE8_POST_CUTOVER_GATE.sql` read-only.

## Stage D — SaaS subscriptions
14. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql`.
15. Deploy the six production subscription Edge Functions listed in the release manifest/readiness documentation.
16. Configure required production secrets, including NMI private API key, lifecycle secret, and webhook signing key. Never place them in browser/runtime config.
17. Install the three production subscription cron jobs using their Vault-backed configuration.
18. Run controlled subscription smoke tests: signup/pending-payment, checkout/activation, renewal failure/grace, cancellation, plan change, and recovery without duplicate provider mutation.

## Stage E — Application release
19. Build the production app with explicit LIVE runtime configuration.
20. Deploy the application only after database and subscription gates are green.
21. Run post-deploy role/access smoke tests for Platform Admin, Agency Admin, Recruiter, Collector/Employee, and Client.
22. Verify new-agency provisioning, employee/client onboarding, account workflow, messaging, reporting/remittance, and cross-tenant negative access.

## Stop rules
- Never skip a failed gate.
- Never run Phase 8 before the rollback-only Agency A/B isolation proof passes.
- Never install subscription phases before the tenant cutover is verified.
- Never use Demo/staging installers against LIVE.
- Never expose service-role, NMI private, lifecycle, or webhook signing secrets to the browser.
- Never mutate LIVE, deploy Edge Functions/cron, merge main, deploy Netlify, or perform a real charge without explicit owner authorization.
