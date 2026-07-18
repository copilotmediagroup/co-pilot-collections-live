Co Pilot Collections Manager - LIVE Import History + Rollback

Upload this ZIP only to GitHub repo: co-pilot-collections-live
Supabase project locked to: https://bwvufgzbkaymffwxuuzr.supabase.co

Run in Bolt terminal:
npm install
npm run dev

No new SQL is required for this update if you already ran the prior CRM SQL files. Import History uses account raw_data batch tags plus local browser metadata, and can infer legacy imports by portfolio.

New feature:
- Admin-only Imports button
- Import History + Rollback full page
- New CSV uploads get automatic batch IDs
- Batch summary: rows, skipped, missing phone, missing SSN, missing DOB, duplicates, total balance
- View all accounts from an import batch
- Export import history CSV
- Export selected batch accounts CSV
- Rollback/hide batch by marking accounts Rolled Back
- Hard delete batch with DELETE confirmation


Settlement Workflow + Approval build: LIVE_SETTLEMENT_WORKFLOW_APPROVAL_TO_GITHUB
- Employees can submit settlement proposals.
- Admin can approve, reject, modify amount, delete, mark paid/broken, or convert approved settlement to a payment plan.
- No new SQL required if the existing security cleanup SQL with the settlements table has already been run.
