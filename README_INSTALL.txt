Co Pilot Collections Manager - LIVE Production Stability Refactor Phase 1

Upload this ZIP only to GitHub repo: co-pilot-collections-live
Supabase project locked to: https://bwvufgzbkaymffwxuuzr.supabase.co

Run in Bolt terminal:
npm install
npm run dev

No new SQL is required for this stability update.

PRODUCTION STABILITY REFACTOR PHASE 1
- Built from the latest Manager QA / Collector Scorecards package.
- Removed the legacy Admin Reports modal that caused modal stacking and delayed behavior.
- Removed the old Reports modal loading patch and old Reports handler bundle.
- Kept the stable full-page Reports screen.
- Added a Reports refresh lock so repeated clicks cannot start multiple report loads at the same time.
- Added a central lightweight stability helper for admin detection and overlay cleanup.
- Preserved Payment Plan admin edit/delete controls.
- Preserved Cleanup, Communications, Import History, Settlement Workflow, Receipts/Docs, Tickler, and Scorecards.
- LIVE package contains no demo setup files or demo login/role override code.

Smoke test after upload:
1. App loads without freezing.
2. Login works.
3. Account queue opens.
4. Notes save.
5. Payment plan create works.
6. Admin edit/delete payment plan works.
7. Reports opens as a full page and Back to Queue works.
8. Compliance opens without stacking behind Reports.
9. Chat/online status still works.

--- Previous README notes kept below ---

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


MANAGER QA + COLLECTOR SCORECARDS UPDATE
- Adds full-page Manager QA / Collector Scorecards.
- Employees can view their own scorecard.
- Admin can review all collectors, save QA/coaching notes, mark Compliance Concern, Coaching Needed, Needs Review, or Good.
- Exports scorecards to CSV.
- No new SQL required; uses existing CRM tables and local QA-note fallback.

