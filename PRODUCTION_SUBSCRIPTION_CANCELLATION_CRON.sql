-- Production-only scheduler for provider-first subscription cancellation.
-- Prerequisites: deploy saas-subscription-cancellation and create Vault secrets
-- named cpcm_project_url and cpcm_subscription_lifecycle_secret.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='cpcm_project_url') then
    raise exception 'Vault secret cpcm_project_url is required';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name='cpcm_subscription_lifecycle_secret') then
    raise exception 'Vault secret cpcm_subscription_lifecycle_secret is required';
  end if;
end $$;

select cron.schedule(
  'cpcm-provider-first-subscription-cancellation',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='cpcm_project_url') || '/functions/v1/saas-subscription-cancellation',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cpcm-lifecycle-secret',(select decrypted_secret from vault.decrypted_secrets where name='cpcm_subscription_lifecycle_secret')
    ),
    body := jsonb_build_object('source','subscription-cancellation-cron','invoked_at',now()),
    timeout_milliseconds := 10000
  ) as request_id;
  $cron$
);
commit;
