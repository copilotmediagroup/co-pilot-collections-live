-- Production-only scheduler for provider-approved checkout recovery.
-- Requires cpcm_project_url and cpcm_subscription_lifecycle_secret in Supabase Vault.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname='cpcm-provider-approved-checkout-recovery';
select cron.schedule(
  'cpcm-provider-approved-checkout-recovery',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='cpcm_project_url') || '/functions/v1/saas-subscription-checkout-recovery',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cpcm-lifecycle-secret',(select decrypted_secret from vault.decrypted_secrets where name='cpcm_subscription_lifecycle_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
