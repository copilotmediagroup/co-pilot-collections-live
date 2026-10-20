# Multi-tenant deployment configuration

The browser application reads `/config.js`. Production and DEMO must never share an accidental fallback.

Preferred deployment configuration uses these Netlify environment variables:

- `CPCM_SUPABASE_URL` — base Supabase project URL only.
- `CPCM_SUPABASE_PUBLISHABLE_KEY` — browser-safe Supabase publishable key.

`npm run build` generates `public/config.js` from those values when they are present. The build validates the URL shape and publishable-key prefix before Vite runs.

For local development, if those variables are absent, the checked-in `public/config.js` remains available. Never put a service-role key in browser config.

Before a DEMO or LIVE cutover, verify the resulting `dist/config.js` points to the intended project before deployment.
