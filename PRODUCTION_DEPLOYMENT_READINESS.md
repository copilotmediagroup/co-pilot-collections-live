# Co Pilot Collections — Production Deployment Readiness

## Current release boundary
- Feature branch: `feature/multi-tenant-saas`
- Subscription migrations: Phases 57–101.
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
2. Apply `MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql` in numeric order.
3. Run the production subscription gate bundle and full multi-tenant preflight before site cutover.

## NMI recurring subscription boundary
The SaaS checkout uses NMI's documented v5 Subscriptions API at `/api/v5/subscriptions`. The browser supplies a one-time Collect.js `payment_token`; the Edge Function supplies the canonical server-side plan amount, monthly/annual cadence, start date, and until-cancelled payment count. Raw card number/CVV are not sent through the application server.

Production credentials remain secrets and must be configured only at release time. No LIVE charge or deployment is performed by readiness validation.

The plan-change processor uses NMI v5 `PUT /api/v5/subscriptions/{subscription_id}` with the stored provider subscription ID and canonical server-side plan price/cadence. Local plan state is finalized only after the provider update succeeds.

## Netlify cutover
After the database migration and Edge Function configuration are verified, run one final production build, then deploy the production branch/site in one controlled release. Smoke-test login, new agency signup, pending-payment routing, subscription/billing page, tenant isolation, employee invite/login, account creation limits, and admin access immediately after deployment.

- `CPCM_SUBSCRIPTION_LIFECYCLE_SECRET` — server-only secret used by scheduled subscription lifecycle processors (cancellation and checkout recovery). Plan changes are initiated by an authenticated agency admin and do not use this shared lifecycle secret.

## Cancellation scheduler
After the cancellation Edge Function is deployed, create Vault secrets `cpcm_project_url` and `cpcm_subscription_lifecycle_secret`, then apply `PRODUCTION_SUBSCRIPTION_CANCELLATION_CRON.sql`. It invokes the provider-first cancellation processor every 15 minutes so end-of-period cancellations do not depend on an agency admin being online. Do not place either secret directly in SQL or browser code.

### Phase 99 checkout recovery
Provider-approved subscription checkouts persist only safe provider identifiers, period timing, and billing anchor metadata before local activation. A lifecycle-secret-protected recovery processor can finish local activation without resubmitting card data or creating another NMI subscription.

## Phase 99 recovery scheduler
After the checkout-recovery Edge Function is deployed and the existing Vault secrets are present, apply `PRODUCTION_SUBSCRIPTION_CHECKOUT_RECOVERY_CRON.sql`. It checks provider-approved/local-incomplete checkouts every 10 minutes and retries only local activation; it does not call NMI or resubmit payment credentials.

## NMI recurring event intake
Deploy `saas-subscription-provider-events` with `CPCM_NMI_WEBHOOK_SIGNING_KEY` set to the signing key shown for the webhook in the NMI Merchant Portal. The receiver validates NMI’s `Webhook-Signature` HMAC-SHA256 over the exact raw request body before parsing or processing the event. The intake claims provider event IDs idempotently, resolves tenants only from stored NMI identities, processes the documented subscription-delete event through the cancellation boundary, and records other recurring events without guessing that a generic subscription update means a successful payment.

## Final subscription release manifest
Deploy the six production subscription Edge Functions before cutover: `saas-subscription-checkout`, `saas-subscription-plan-change`, `saas-subscription-cancellation`, `saas-subscription-checkout-recovery`, `saas-subscription-plan-change-recovery`, and `saas-subscription-provider-events`. Configure `NMI_PRIVATE_API_KEY` only for provider-mutating functions, `CPCM_SUBSCRIPTION_LIFECYCLE_SECRET` for scheduled cancellation, checkout recovery, and plan-change recovery, and `CPCM_NMI_WEBHOOK_SIGNING_KEY` for recurring-event signature verification. Apply all three production cron SQL files only after their target Edge Functions and Vault secrets are present: `PRODUCTION_SUBSCRIPTION_CANCELLATION_CRON.sql`, `PRODUCTION_SUBSCRIPTION_CHECKOUT_RECOVERY_CRON.sql`, and `PRODUCTION_SUBSCRIPTION_PLAN_CHANGE_RECOVERY_CRON.sql`.

NMI webhook deliveries can be retried, so the recurring-event intake must retain its provider event-id idempotency ledger. The endpoint must return success only after the event has been safely finalized or intentionally ignored.

## Gateway JWT configuration
NMI webhook intake and lifecycle-secret cron processors are intentionally configured with `verify_jwt = false` in `supabase/config.toml`. They still authenticate inside function code: provider events verify the NMI webhook signature, while cancellation and checkout recovery require the server-only lifecycle secret. Browser-facing checkout and plan-change functions retain their user-JWT boundary. `saas-subscription-plan-change-recovery` is also gateway-JWT-disabled because it is a lifecycle-secret-protected scheduled processor.

- Phase 100 atomically finalizes provider-approved checkout activation, recurring billing anchor, organization activation, and paid checkout state in one database transaction. Checkout and recovery processors use this canonical finalizer so a partial anchor write cannot strand a paid checkout.

## Phase 101 plan-change recovery
After NMI accepts a plan change, the provider reference is persisted before local finalization. If local finalization fails, `saas-subscription-plan-change-recovery` retries only the local canonical finalizer and never calls NMI again. Deploy it with the lifecycle secret, then apply `PRODUCTION_SUBSCRIPTION_PLAN_CHANGE_RECOVERY_CRON.sql`; the scheduler uses the existing Vault project URL and lifecycle secret.

## Controlled production smoke test
After the Phase 57–101 installer, six Edge Functions, required secrets, webhook signing key, and three schedulers are installed, validate one controlled production agency end to end before opening registration broadly: create/verify agency, purchase one subscription, confirm organization activation and billing anchor, invite an employee, verify tenant isolation and plan capacity, exercise billing management without creating a duplicate provider mutation, and confirm lifecycle processors return authenticated healthy responses.
