import fs from 'node:fs';const s=fs.readFileSync('MULTI_TENANT_PHASE81_PLAN_CHANGE_PROVIDER_HANDOFF.sql','utf8');const checks=[
['handoff rpc',/cpcm_service_get_subscription_plan_change_handoff/.test(s)],
['service role required',/auth\.role\(\).*service_role/i.test(s)],
['provider pending only',/r\.status='provider_pending'/.test(s)],
['demo excluded',/coalesce\(o\.is_demo,false\)=false/i.test(s)],
['canonical catalog joined',/saas_plan_catalog/.test(s)&&/p\.plan_code=r\.requested_plan/.test(s)],
['existing provider identity returned',/provider_customer_id/.test(s)&&/provider_subscription_id/.test(s)],
['no card data',!/(pan|cvv|cvc|card_number|payment_token)/i.test(s)],
['browser revoked',/from public,anon,authenticated/i.test(s)],
['service granted',/to service_role/i.test(s)]
];let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
