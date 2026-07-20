CO PILOT COLLECTIONS MANAGER — LIVE PACKAGE

Upload this ZIP only to GitHub repo:
co-pilot-collections-live

Supabase project locked to:
https://bwvufgzbkaymffwxuuzr.supabase.co

Before testing, run ALL SQL files in this order:
1. SQL_TO_RUN_IN_SUPABASE/RUN_THIS_MESSENGER_STAFF_NAMES_SQL.sql
2. SQL_TO_RUN_IN_SUPABASE/RUN_THIS_CLIENT_PORTAL_MVP_SQL.sql
3. SQL_TO_RUN_IN_SUPABASE/RUN_THIS_STAFF_APPROVAL_ACTIONS_FIX_SQL.sql
in the matching LIVE Supabase SQL Editor.

Do not upload this package to the DEMO repo.
Do not add demo login buttons or demo role overrides to this LIVE package.

DOCUMENT PDF + SIGNATURE R3:
- Download PDF creates the receipt/letter from the visible Preview.
- Electronic signature supports mouse, trackpad, stylus, or touch.
- PDF libraries are embedded directly in index.html; no CDN or separate vendor-file request is required.
- No additional Supabase SQL is required for this PDF/signature feature.

R3 BOLT PREVIEW FIX:
- Fixes “The PDF engine did not load” in Bolt preview.
- The PDF engine is decoded from the app itself, so preview does not depend on /vendor paths.

R4 document update: saved app branding is used on receipts/letters; customer-facing Created By is the brand name; typed electronic signature chooser replaces freehand signing. No new SQL is required.


R5 CLIENT / PORTFOLIO OWNER PORTAL MVP:
- Client role and approval workflow.
- Admin assigns portfolio names to client users.
- Client-safe dashboard, accounts, payments, performance, CSV, and PDF report.
- Clients cannot enter collector queue, notes, Messenger, scorecards, compliance, or admin tools.


R7 STAFF ACCESS FIX:
- Approve, Hold/Pending, Reject, Activate/Pause, and Remove now use an admin-only Supabase RPC.
- Fixes action buttons that were blocked by direct table PATCH/RLS behavior.
- Staff controls are compact, status-aware, and display success/error feedback.
- Remove returns assigned accounts to the unassigned queue.

R7 REQUIRED INCREMENTAL SQL:
SQL_TO_RUN_IN_SUPABASE/RUN_THIS_CLIENT_PORTAL_LEDGER_SCHEMA_FIX_R7.sql
Run it in this package's matching Supabase project before client portal testing.


R8 CLIENT REMITTANCE + AGENCY FEE ACCOUNTING:
Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_CLIENT_REMITTANCE_AGENCY_FEE_R8.sql in this matching LIVE Supabase project before testing.
This release adds fee schedules, remittance batches, batch payment detail, client statements, branded PDF/CSV exports, and processor-fee capture.
Build marker: STABLE_SINGLE_FILE_QA_LOCK_2026_07_19_R8N2


NETLIFY DEPLOYMENT FIX:
- package-lock.json uses only https://registry.npmjs.org/
- .npmrc forces the public npm registry
- netlify.toml sets npm run build and publishes dist


R8N1 SILENT LOGIN STARTUP FIX:
- Removes the duplicate startup boot that could race against an expired or cleared session.
- The logged-out login page no longer displays 'Could not load accounts: Not logged in.'
- Real account-loading errors still display after authentication.
- No Supabase SQL is required for this fix.


R8N2 LIVE ENVIRONMENT PROTECTION:
- LIVE keeps the standard email/password and access-request login.
- LIVE contains no Demo Admin/Employee buttons, embedded demo credentials, or public-demo import restrictions.
- The R8N2 demo guard SQL must never be run in LIVE.


========================================================================
R8N11 DYNAMIC ACTIVITY + STATISTICS NOTES
========================================================================
CO PILOT COLLECTIONS MANAGER — LIVE R8N11

DYNAMIC ACTIVITY + LIVE STATISTICS UPDATE

WHAT CHANGED
- Clicking any debtor phone number now saves one Call Attempt before the phone application opens.
- The attempt immediately counts in Calls, Call Intelligence, Reports, Monitor, and Scorecards.
- Saving a call outcome updates the same attempt instead of creating a second call.
- Rapid double-click protection prevents duplicate attempts.
- Account opens are logged as Account Opened activity with a 10-minute per-account dedupe window.
- Open analytics screens automatically refresh after saved activity.
- Open analytics screens poll every 12 seconds while visible so admin can see activity from other users.
- Notes, statuses, payment promises, plans, settlements, payments, communications, and other database changes trigger a shared statistics refresh.

REQUIRED SQL
Run this file once in the matching LIVE Supabase project:
SQL_TO_RUN_IN_SUPABASE/RUN_THIS_DYNAMIC_ACTIVITY_STATS_CALL_DEDUPE_R8N11.sql

The SQL is safe to run more than once. It adds atomic call-attempt functions, call counters, dedupe keys, and supporting indexes.

UPLOAD RULE
This package is for LIVE only. Do not mix LIVE and DEMO files or Supabase credentials.

SMOKE TEST
1. Login as an employee.
2. Open an account and click one phone number once.
3. Confirm Call Intelligence shows 1 Call Attempt.
4. Save No Answer or another outcome.
5. Confirm the call total remains 1 and the result changes from Call Attempt to the saved outcome.
6. Open Admin Monitor, Reports, and Scorecards and verify the same call is counted once.
7. In a second browser, create activity and confirm an open admin analytics screen refreshes within about 12 seconds.
