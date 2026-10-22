import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE74_SUBSCRIPTION_GRACE_POLICY.sql','utf8');
const app=fs.readFileSync('index.html','utf8');
const checks=[
 ['grace field',/grace_period_ends_at/i.test(sql)],
 ['grace service RPC',/cpcm_service_set_subscription_grace/i.test(sql)],
 ['service role required',/auth\.role\(\).*service_role/i.test(sql)],
 ['past due only',/status='past_due'/i.test(sql)],
 ['demo protected',/Demo organizations do not have production subscriptions/i.test(sql)],
 ['browser revoked',/from public,anon,authenticated/i.test(sql)],
 ['plan change mode',/saasPlanChangeMode/i.test(app)],
 ['plan change safety rpc used',/cpcm_create_subscription_plan_change_request/.test(app)],
 ['management opens change mode',/openSaasPricing\(true\)/.test(app)],
 ['active change does not use signup selection',/if\(saasPlanChangeMode\)[\s\S]{0,900}cpcm_create_subscription_plan_change_request/.test(app)]
];let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
