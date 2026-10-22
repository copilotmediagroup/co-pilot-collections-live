import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE77_PLAN_CHANGE_PROVIDER_CLAIM.sql','utf8');
const p75=fs.readFileSync('MULTI_TENANT_PHASE75_PLAN_CHANGE_REQUEST_LIFECYCLE.sql','utf8');
const p76=fs.readFileSync('MULTI_TENANT_PHASE76_PLAN_CHANGE_BROWSER_WORKFLOW.sql','utf8');
const checks=[
 ['provider claim rpc',/cpcm_service_claim_subscription_plan_change/i.test(sql)],
 ['service role required',/auth\.role\(\).*service_role/i.test(sql)],
 ['only requested claimable',/r\.status <> 'requested'/i.test(sql)],
 ['claim moves provider pending',/status='provider_pending'/i.test(sql)],
 ['provider submission timestamp',/provider_submitted_at/i.test(sql)],
 ['demo protected',/Demo organizations do not have production subscriptions/i.test(sql)],
 ['subscription state rechecked',/sub\.status not in \('active','past_due'\)/i.test(sql)],
 ['stale plan request blocked',/Subscription plan changed after request creation/i.test(sql)],
 ['browser revoked',/from public,anon,authenticated/i.test(sql)],
 ['service granted',/to service_role/i.test(sql)],
 ['finalizer accepts provider pending',/r\.status not in \('requested','provider_pending'\)/i.test(p75)],
 ['browser cancellation cannot cancel provider pending',/r\.status='requested'/i.test(p76)]
];let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
