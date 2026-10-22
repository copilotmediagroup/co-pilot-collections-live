# Co Pilot Collections — Production Deployment Readiness

## Current release boundary
- Feature branch: `feature/multi-tenant-saas`
- Subscription migrations: Phases 57–94.
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
- `NMI_API_BASE` if the merchant account requires a non-default base
- `NMI_SAAS_RECURRING_ENDPOINT` **only after the exact merchant recurring API contract is verified**

## Database release order
1. Confirm the existing production multi-tenant foundation through Phase 56 is present.
2. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_94.sql` in numeric order.
3. Run the production subscription gate bundle and full multi-tenant preflight before site cutover.

## Release blocker
Real SaaS subscription charging is intentionally not release-ready until the exact Easy Pay Direct/NMI recurring API endpoint, authentication requirements, request fields, response fields, and vault/recurring identifiers are verified against the merchant account documentation.

The current checkout function fails closed when `NMI_SAAS_RECURRING_ENDPOINT` is absent and reports that no charge was attempted. Do not guess this contract and do not enable real subscription checkout until verified.

## Netlify cutover
After the database migration and Edge Function configuration are verified, run one final production build, then deploy the production branch/site in one controlled release. Smoke-test login, new agency signup, pending-payment routing, subscription/billing page, tenant isolation, employee invite/login, account creation limits, and admin access immediately after deployment.
