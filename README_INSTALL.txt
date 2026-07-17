Co Pilot Collections Manager - LIVE Package

Repo target: co-pilot-collections-live
Supabase project: https://bwvufgzbkaymffwxuuzr.supabase.co
Live admin: afinch2678@gmail.com

This LIVE package is cleaned for production separation. It does not include demo login buttons, demo role override behavior, or demo database setup SQL files.

Included upgrade:
- Admin Reports modal
- Collected dollars today / week / month
- Promises created, promises kept, broken promises
- Collector ranking
- Liquidation rate
- Contact rate and right-party-contact rate
- Portfolio performance
- Employee activity
- CSV export
- Print / Save PDF report

Run in Bolt:
npm install
npm run dev

Important:
- This package is for LIVE only.
- Do not upload this ZIP to the DEMO repo.
- Config URLs use the base Supabase URL only, no /rest/v1/.


COMPLIANCE GUARD UPDATE:
- Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_COMPLIANCE_GUARD_SQL.sql in the matching LIVE Supabase project.
- The app now adds Compliance Guard / Call Rules: DNC, cease & desist, disputed/frozen, bankruptcy, deceased, attorney represented, wrong number, manager review, consent, call-window checks, daily call limit warnings, and admin override logging.

PROMISE AUTOMATION + COLLECTOR ALERTS UPDATE
1. Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_PROMISE_AUTOMATION_AND_CALL_INTELLIGENCE_SQL.sql in the matching LIVE Supabase project.
2. Upload this ZIP only to the LIVE GitHub repo.
3. In the app, use Alerts or Broken to auto-detect missed promises, create follow-ups, update broken promise status, and export collector alerts.


CALL LOGGING + CONTACT INTELLIGENCE
- Run SQL_TO_RUN_IN_SUPABASE/RUN_THIS_PROMISE_AUTOMATION_AND_CALL_INTELLIGENCE_SQL.sql in the matching Supabase project.
- Phone clicks still use tel: links so RingCentral Chrome extension can detect/dial them.
- After a phone click, the CRM auto-opens a call outcome popup so collectors can log No Answer, Voicemail, RPC, Promise, Refusal, Dispute, Callback, Wrong Number, DNC, etc.
- The Calls / Contact Intelligence dashboard tracks contact rate, right-party-contact rate, collector call report, callback queue, bad-number review, recent calls, and CSV export.


PAYMENT SAVE FIX INCLUDED:
If notes, payment promises, or payment plans do not save, run this SQL in the matching Supabase project and refresh the app:
SQL_TO_RUN_IN_SUPABASE/RUN_THIS_PROMISE_AUTOMATION_AND_CALL_INTELLIGENCE_SQL.sql


PAYMENT PLAN UI + ADMIN LOCK UPDATE
- Redesigned the account Payment Plan card into a cleaner professional summary + progress + schedule table layout.
- Employees can view payment plans only.
- Only Admin can create, edit, save, or delete payment plans.
- No new SQL is required for the UI/admin-lock update if the previous payment save SQL was already run.
