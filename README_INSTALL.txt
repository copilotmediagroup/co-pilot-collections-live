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
