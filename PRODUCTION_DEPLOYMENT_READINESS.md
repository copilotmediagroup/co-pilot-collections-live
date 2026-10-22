# Co Pilot Collections — Production Deployment Readiness

## Current release boundary
- Feature branch: `feature/multi-tenant-saas`
- Subscription migrations: Phases 57–95.
- Netlify build: `npm run build`, publish `dist`, Node 20.
- Production runtime mode must be `live`.
- Public Demo is separate and must not receive this production installer.

## Required Netlify build environment
- `CPCM_SUPABASE_URL` — production Supabase project URL.
- `CPCM_SUPABASE_PUBLISHABLE_KEY` — production publishable key.
- `CPCM_DEPLOYMENT_MODE=live`.

These are browser/runtime configuration values. Do not place service-role or NMI private credentials in browser/Netlify build variables consumed by `config.js`.

## Required Supabase Edge Function secrets
For `saas-subscription-checkout`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or the existing supported `SUPABASE_SECRET_KEYS` mechanism)
- `NMI_PRIVATE_API_KEY`
- `NMI_API_BASE` only if overriding the production default (`https://secure.nmi.com`)

## Database release order
1. Confirm the existing production multi-tenant foundation through Phase 56 is present.
2. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_95.sql` in numeric order.
3. Run the production subscription gate bundle and full multi-tenant preflight before site cutover.

## NMI recurring subscription boundary
The SaaS checkout uses NMI's documented v5 Subscriptions API at `/api/v5/subscriptions`. The browser supplies a one-time Collect.js `payment_token`; the Edge Function supplies the canonical server-side plan amount, monthly/annual cadence, start date, and until-cancelled payment count. Raw card number/CVV are not sent through the application server.

Production credentials remain secrets and must be configured only at release time. No LIVE charge or deployment is performed by readiness validation.

## Netlify cutover
After the database migration and Edge Function configuration are verified, run one final production build, then deploy the production branch/site in one controlled release. Smoke-test login, new agency signup, pending-payment routing, subscription/billing page, tenant isolation, employee invite/login, account creation limits, and admin access immediately after deployment.
