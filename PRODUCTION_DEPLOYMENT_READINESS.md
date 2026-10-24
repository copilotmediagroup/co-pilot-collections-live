# Co Pilot Collections — Production Deployment Readiness

## Current release boundary
- Feature branch: `feature/multi-tenant-saas`
- Subscription migrations: Phases 57–99.
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
2. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_99.sql` in numeric order.
3. Run the production subscription gate bundle and full multi-tenant preflight before site cutover.

## NMI recurring subscription boundary
The SaaS checkout uses NMI's documented v5 Subscriptions API at `/api/v5/subscriptions`. The browser supplies a one-time Collect.js `payment_token`; the Edge Function supplies the canonical server-side plan amount, monthly/annual cadence, start date, and until-cancelled payment count. Raw card number/CVV are not sent through the application server.

Production credentials remain secrets and must be configured only at release time. No LIVE charge or deployment is performed by readiness validation.

The plan-change processor uses NMI v5 `PUT /api/v5/subscriptions/{subscription_id}` with the stored provider subscription ID and canonical server-side plan price/cadence. Local plan state is finalized only after the provider update succeeds.

## Netlify cutover
After the database migration and Edge Function configuration are verified, run one final production build, then deploy the production branch/site in one controlled release. Smoke-test login, new agency signup, pending-payment routing, subscription/billing page, tenant isolation, employee invite/login, account creation limits, and admin access immediately after deployment.

- `CPCM_SUBSCRIPTION_LIFECYCLE_SECRET` — server-only secret used by provider-first subscription lifecycle processors (cancellation and plan changes).

## Cancellation scheduler
After the cancellation Edge Function is deployed, create Vault secrets `cpcm_project_url` and `cpcm_subscription_lifecycle_secret`, then apply `PRODUCTION_SUBSCRIPTION_CANCELLATION_CRON.sql`. It invokes the provider-first cancellation processor every 15 minutes so end-of-period cancellations do not depend on an agency admin being online. Do not place either secret directly in SQL or browser code.

### Phase 99 checkout recovery
Provider-approved subscription checkouts persist only safe provider identifiers, period timing, and billing anchor metadata before local activation. A lifecycle-secret-protected recovery processor can finish local activation without resubmitting card data or creating another NMI subscription.

## Phase 99 recovery scheduler
After the checkout-recovery Edge Function is deployed and the existing Vault secrets are present, apply `PRODUCTION_SUBSCRIPTION_CHECKOUT_RECOVERY_CRON.sql`. It checks provider-approved/local-incomplete checkouts every 10 minutes and retries only local activation; it does not call NMI or resubmit payment credentials.

## NMI recurring event intake
Deploy `saas-subscription-provider-events` with a dedicated `CPCM_NMI_WEBHOOK_SECRET` and configure the NMI recurring-event callback to send that secret as `x-cpcm-nmi-webhook-secret`. The intake claims provider event IDs idempotently, resolves tenants only from stored NMI identities, processes the documented subscription-delete event through the cancellation boundary, and records other recurring events without guessing that a generic subscription update means a successful payment.
