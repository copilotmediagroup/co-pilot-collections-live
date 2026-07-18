Co Pilot Collections Manager - LIVE Modular Codebase Refactor Phase 2

Upload this ZIP only to the LIVE GitHub/Bolt project.

What changed:
- Extracted the giant inline stylesheet into public/app/styles.css.
- Extracted the inline application JavaScript into public/app/main.js.
- Kept index.html as page markup only.
- Preserved the Phase 1 Reports stability cleanup and full-page navigation approach.
- Added a small shared CoPilotApp helper namespace for future centralized permissions/stability helpers.
- No new SQL required.

Supabase target:
https://bwvufgzbkaymffwxuuzr.supabase.co

Run in Bolt terminal:
npm install
npm run dev

If Vite is missing:
npm install vite@^5.4.20 --save-dev
npm run dev
