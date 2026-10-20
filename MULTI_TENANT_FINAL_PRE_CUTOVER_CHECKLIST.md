# Co Pilot Collections — Final Pre-Cutover Checklist

## Already green on DEMO
- Phase 8 organization-default removal.
- Tenant A/B isolation: agency admin, collector, client, extended data.
- Seeded financial/document isolation.
- Broad RLS policy audit and legacy admin-policy repair.
- High-impact RPC security and final function privilege audit.
- Frontend tenant stamping for inserts, row mutations, and bulk account mutations.
- Service-role tenant binding for Voice Broadcast, Bland AI, RingCentral, and NMI reviewed/hardened.
- Legacy owner-email frontend privilege removed.

## Remaining before LIVE
1. Install Phase 26 on DEMO and run its structural gate.
2. Run Phase 26 synthetic provisioning lifecycle with a disposable DEMO auth user.
3. New-agency smoke: agency admin login -> staff/client/account creation -> assignment -> call/note -> promise/plan -> Messenger -> report/remittance.
4. Cross-tenant negative smoke with the newly provisioned agency.
5. Final production build and source scans.
6. Freeze migration order and LIVE rollback/checkpoint instructions.
7. Only with explicit owner authorization: apply proven migrations/functions to LIVE, deploy app, then post-deploy smoke.

## Cutover rule
No LIVE Supabase mutation, GitHub push, main merge, or Netlify deploy until explicitly authorized.
