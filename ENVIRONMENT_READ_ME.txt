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


========================================================================
R8N12 — LIVE NMI PHASE 1 SECURE CARD PAYMENTS
========================================================================
BUILD MARKER: STABLE_SINGLE_FILE_QA_LOCK_2026_07_20_R8N12

THIS PACKAGE IS LIVE ONLY
- GitHub repo: co-pilot-collections-live
- Supabase project ref: bwvufgzbkaymffwxuuzr
- Never upload this package to the DEMO repo.

SECURITY FIRST
- The NMI private key previously pasted into chat must be revoked and replaced.
- Never place the replacement private key in index.html, public/nmi-config.js, GitHub, Bolt, or Netlify frontend variables.
- public/nmi-config.js accepts ONLY the NMI PUBLIC TOKENIZATION KEY.
- Card number, expiration, and CVV are collected inside NMI Collect.js hosted fields and are not stored by Co Pilot.

STEP 1 — RUN THE NEW DATABASE MIGRATION
In LIVE Supabase -> SQL Editor, run:
SQL_TO_RUN_IN_SUPABASE/RUN_THIS_NMI_PHASE1_LIVE_R8N12.sql

STEP 2 — PASTE THE PUBLIC TOKENIZATION KEY
Open:
public/nmi-config.js

Replace:
PASTE_NMI_PUBLIC_TOKENIZATION_KEY_HERE

with the NMI PUBLIC tokenization key. This public key is the only NMI credential that belongs in the browser package.

STEP 3 — DEPLOY THE INCLUDED EDGE FUNCTIONS
The package contains:
- supabase/functions/nmi-payments/index.ts
- supabase/functions/nmi-webhook/index.ts
- supabase/config.toml

From a terminal authenticated with Supabase CLI:

supabase login
supabase link --project-ref bwvufgzbkaymffwxuuzr
supabase functions deploy nmi-payments --project-ref bwvufgzbkaymffwxuuzr --no-verify-jwt
supabase functions deploy nmi-webhook --project-ref bwvufgzbkaymffwxuuzr --no-verify-jwt

The payment function validates the logged-in Supabase user itself. The webhook function uses NMI signature verification instead of a Supabase user JWT.

STEP 4 — ADD PRIVATE SECRETS IN LIVE SUPABASE
In Supabase -> Edge Functions -> Secrets, add:

NMI_PRIVATE_API_KEY
Value: the NEW replacement NMI PRIVATE API key

NMI_WEBHOOK_SIGNING_KEY
Value: the signing key shown after creating the NMI webhook

Optional test/sandbox secret:
NMI_API_BASE=https://sandbox.nmi.com

Production default if NMI_API_BASE is not set:
https://secure.nmi.com

CLI alternative:
supabase secrets set NMI_PRIVATE_API_KEY="PASTE_NEW_PRIVATE_KEY_HERE" --project-ref bwvufgzbkaymffwxuuzr
supabase secrets set NMI_WEBHOOK_SIGNING_KEY="PASTE_WEBHOOK_SIGNING_KEY_HERE" --project-ref bwvufgzbkaymffwxuuzr

Do not save a .env file containing these values in GitHub.

STEP 5 — CREATE THE NMI WEBHOOK
In the NMI merchant portal, open Settings -> Webhooks and create an HTTPS webhook for transaction sale, refund, and void events.

Webhook URL:
https://bwvufgzbkaymffwxuuzr.supabase.co/functions/v1/nmi-webhook

Copy the NMI webhook signing key into the Supabase secret named NMI_WEBHOOK_SIGNING_KEY.

STEP 6 — FIRST CONTROLLED TEST
1. Use an NMI test account/test key when available.
2. Login to Co Pilot LIVE as admin or an approved employee.
3. Open a test account with a small balance.
4. Quick Actions -> Secure Card Payment (NMI).
5. Enter a small test amount and complete the hosted card fields.
6. Confirm exactly one Payment appears in the ledger.
7. Confirm the balance decreases only after NMI approval.
8. Confirm account history, payment statistics, remittance totals, and Receipt Center update.
9. As admin, test Void before settlement and Refund after settlement according to NMI availability.
10. Confirm a failed/declined payment does not change the account balance.

IMPORTANT PAYMENT SAFETY
- The payment button locks while processing.
- Co Pilot uses its own idempotency key plus NMI duplicate checking.
- If the screen says NMI approved but Co Pilot needs reconciliation, DO NOT submit the payment again. Use the displayed NMI transaction ID and review the gateway/Co Pilot webhook event.
- Employees can process payments only on accounts assigned to them. Admin can process any account.
- Refund and Void controls are admin-only.
- Full card numbers and CVVs are never written to the Co Pilot database, logs, ledger, or receipts.

PHASE 1 SCOPE
Included:
- One-time credit/debit card sales
- Approved and declined handling
- Account balance and payment ledger posting
- Automatic payment-plan allocation
- Activity, audit, reporting, remittance, and statistics refresh
- Branded receipt workflow
- Admin-only void and partial/full refund
- Signed NMI webhook reconciliation
- Duplicate-payment protection

Not included yet:
- ACH/e-check
- Customer Vault / stored cards
- Automatic recurring installment charging
- Consumer self-service payment links
- Chargeback workflow automation
CO PILOT COLLECTIONS LIVE — NMI CARD FIELD HOTFIX R8N13

This update repairs the NMI Card Number hosted field initialization.

IMPORTANT:
- Keep your existing public/nmi-config.js public key when uploading.
- Do not paste any private NMI key into GitHub.
- No new Supabase SQL is required.
- No Edge Function redeployment is required.

After GitHub/Netlify deployment:
1. Hard refresh the LIVE app (Command + Shift + R).
2. Open Secure Card Payment.
3. Confirm the line says All three secure fields are ready.
4. Click Card Number and type.
5. If a browser extension blocks the iframe, click Reload Secure Fields once.

The payment amount must not exceed the account balance.


R8N17 NMI APPROVAL QUEUE: Preserve the existing public/nmi-config.js and NMI keys. Employees cannot run cards; administrators approve and process.
