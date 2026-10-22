import fs from 'node:fs';
const s=fs.readFileSync('MULTI_TENANT_PHASE94_PROVIDER_EVENT_AUDIT_READER.sql','utf8');let failed=false;
const c=(n,r)=>{const ok=r.test(s);console.log(ok?'PASS':'FAIL',n);if(!ok)failed=true};
c('audit reader rpc',/cpcm_service_saas_provider_event_audit\(p_event_id uuid\)/);
c('service role required',/auth\.role\(\).*service_role/);
c('reads event ledger',/from public\.saas_subscription_provider_events e/);
c('returns provider event identity',/provider_event_id text/);
c('returns organization binding',/organization_id uuid/);
c('returns terminal diagnostic',/failure_message text/);
c('returns processing timestamps',/processed_at timestamptz/);
c('demo protected',/coalesce\(o\.is_demo,false\)=false/);
c('browser revoked',/revoke all on function public\.cpcm_service_saas_provider_event_audit\(uuid\) from public,anon,authenticated/);
c('service granted',/grant execute on function public\.cpcm_service_saas_provider_event_audit\(uuid\) to service_role/);
{const ok=!/(\bpan\b|\bcvv\b|payment_token|vault_token)/i.test(s);console.log(ok?'PASS':'FAIL','no payment credentials');if(!ok)failed=true;}
if(failed)process.exit(1);
