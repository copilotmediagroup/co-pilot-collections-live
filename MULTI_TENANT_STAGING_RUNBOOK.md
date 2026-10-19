# Multi-tenant staging execution runbook

**Never run this sequence against LIVE first.** Target a disposable/staging Supabase project restored from the current Collections schema.

## Execution order
1. Existing schema/migrations through current production baseline.
2. `MULTI_TENANT_PHASE1_FOUNDATION.sql`
3. `MULTI_TENANT_PHASE3_TENANT_KEYS_AND_TEST_HARNESS.sql`
4. `MULTI_TENANT_PHASE4_SINGLETON_CONFIG_KEYS.sql`
5. `MULTI_TENANT_PHASE5_RPC_TENANT_BINDING.sql`
6. `MULTI_TENANT_PHASE6_RINGCENTRAL_TENANT_OWNERSHIP.sql`
7. `MULTI_TENANT_PHASE9_RPC_GUARDRAILS.sql`
8. `MULTI_TENANT_PHASE10_CLIENT_PORTAL_RPCS.sql`
9. `MULTI_TENANT_PHASE11_STAFF_ADMIN_RPC.sql`
10. `MULTI_TENANT_PHASE12_REMITTANCE_RPCS.sql`
11. `MULTI_TENANT_PHASE13_COMMISSIONS_PAYMENT_APPROVALS.sql`
12. `MULTI_TENANT_PHASE2_TENANT_FENCE_DRAFT.sql`
13. `MULTI_TENANT_PHASE14_LEGACY_POLICY_CLEANUP.sql`
14. `MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql`
15. `MULTI_TENANT_PHASE17_MESSENGER_STAFF_RPCS.sql`
16. `MULTI_TENANT_PHASE16_STAGING_READINESS.sql`
17. `MULTI_TENANT_PHASE7_ISOLATION_ASSERTIONS.sql`
18. Perform JWT/REST Agency A vs Agency B attack tests.
19. Only after all tests pass: `MULTI_TENANT_PHASE8_REMOVE_LEGACY_DEFAULTS.sql`.

## Hard stop conditions
Stop immediately on any SQL error, duplicate/ambiguous active membership, missing tenant policy, cross-tenant row visibility, forged organization ownership, broken client portfolio restriction, broken collector restriction, or public recruiting data visible to an agency.

## Required A/B tests
Create two organizations and one auth login per organization. Create one account/payment plan/payment/message/document/AI attempt/voice campaign/call record per agency. With Agency A JWT, direct REST requests targeting Agency B primary keys must return zero rows and update/delete zero rows. An Agency A insert carrying Agency B `organization_id` must be overwritten to A or denied. Repeat in reverse. Platform admin may inspect both; ordinary agency admins may not. Anonymous recruiter submission must succeed without exposing the application to either agency.

## Cutover rule
Do not merge to `main`, execute Phase 8, or deploy tenant-aware frontend/functions to production until the complete staging gate passes.
