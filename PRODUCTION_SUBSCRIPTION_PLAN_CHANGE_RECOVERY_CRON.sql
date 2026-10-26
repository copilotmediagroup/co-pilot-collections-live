-- Production-only: retry local finalization after NMI has already accepted a plan change.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname='cpcm-provider-confirmed-plan-change-recovery';
select cron.schedule('cpcm-provider-confirmed-plan-change-recovery','*/10 * * * *',$$
 select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='cpcm_project_url' limit 1) || '/functions/v1/saas-subscription-plan-change-recovery',
 headers := jsonb_build_object('Content-Type','application/json','x-cpcm-lifecycle-secret',(select decrypted_secret from vault.decrypted_secrets where name='cpcm_subscription_lifecycle_secret' limit 1)),body := '{}'::jsonb);
$$);
