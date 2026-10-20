# Co Pilot Collections — Final Pre-Cutover Checklist

## Already green on DEMO
- Phase 8 organization-default removal.
- Tenant A/B isolation: agency admin, collector, client, extended data.
- Seeded financial/document isolation.
- Broad RLS policy audit and legacy admin-policy repair.
- High-impact RPC security and final function privilege audit through the previously installed tenant phases.
- Frontend tenant stamping for inserts, row mutations, and bulk account mutations.
- Service-role tenant binding for Voice Broadcast, Bland AI, RingCentral, and NMI reviewed/hardened.
- Legacy owner-email frontend privilege removed.

## Built locally and awaiting DEMO installation/gates
- Phase 26: platform tenant provisioning.
- Phase 27: platform organization lifecycle administration.
- Phase 28: suspended/cancelled organization enforcement.
- Phase 29: browser-safe current-organization resolver.
- Phase 30: trusted first agency-admin app profile bootstrap.
- Phase 31: employee/client join-code onboarding; no admin self-promotion.
- Phase 32: staff approval/removal synchronized to tenant membership lifecycle.
- Phase 33: tenant-safe agency-admin join-code creation/listing/deactivation.
- Ordered DEMO installer: `MULTI_TENANT_DEMO_PENDING_INSTALL_26_33.sql`.
- Ordered structural/security gates: `MULTI_TENANT_DEMO_PENDING_GATES_26_33.sql`.

## Remaining before LIVE
1. With explicit DEMO database authorization, install phases 26-33 and run all bundled structural/security gates.
2. Run Phase 26/28 synthetic lifecycle tests with disposable DEMO auth users.
3. New-agency smoke: provision agency -> first admin login/bootstrap -> create employee/client join codes -> signup -> approve -> account creation -> assignment -> call/note -> promise/plan -> Messenger -> report/remittance.
4. Staff lifecycle smoke: deactivate/remove employee and verify tenant resolution/access is blocked; reactivate approved employee and verify access returns.
5. Cross-tenant negative smoke with the newly provisioned agency, including join-code misuse attempts.
6. Final production build and source/security scans.
7. Freeze LIVE migration order and rollback/checkpoint instructions.
8. Only with explicit owner authorization: apply proven migrations/functions to LIVE, configure deployment environment, deploy app, then post-deploy smoke.

## Cutover rule
No LIVE Supabase mutation, GitHub push, main merge, or Netlify deploy until explicitly authorized.
