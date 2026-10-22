import fs from 'node:fs';
const s=fs.readFileSync('MULTI_TENANT_PHASE93_PROVIDER_EVENT_IDENTITY_BINDING.sql','utf8');let failed=false;const c=(n,r)=>{const ok=r.test(s);console.log(ok?'PASS':'FAIL',n);if(!ok)failed=true};
c('resolve and bind rpc',/cpcm_service_resolve_and_bind_saas_provider_event/);
c('service role required',/auth\.role\(\).*service_role/s);
c('locks event row',/where id=p_event_id for update/i);
c('received only',/Only received provider events can be resolved and bound/);
c('provider match enforced',/provider does not match supplied provider/i);
c('uses trusted resolver',/cpcm_service_resolve_saas_provider_organization/);
c('unresolved identity rejected',/did not resolve to an organization/i);
c('cross tenant binding blocked',/already bound to another organization/i);
c('uses safe binder',/cpcm_service_bind_saas_provider_event_organization/);
c('browser revoked',/revoke all on function[\s\S]*from public,anon,authenticated/i);
c('service granted',/grant execute on function[\s\S]*to service_role/i);
{const ok=!/(subscription\.charged|recurring\.payment|webhook_secret|signature_header)/i.test(s);console.log(ok?'PASS':'FAIL','no provider webhook names invented');if(!ok)failed=true;}
if(failed)process.exit(1);
