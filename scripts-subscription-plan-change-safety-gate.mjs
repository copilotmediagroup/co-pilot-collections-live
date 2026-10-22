import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE72_PLAN_CHANGE_SAFETY.sql','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['plan change RPC',/cpcm_request_subscription_plan_change/i.test(sql)],
 ['admin required',/Agency admin required/i.test(sql)],
 ['demo protected',/Demo organizations do not have production subscriptions/i.test(sql)],
 ['canonical plan catalog',/saas_plan_catalog/i.test(sql)],
 ['user downgrade guard',/active users exceed the target plan limit/i.test(sql)],
 ['account downgrade guard',/accounts exceed the target plan limit/i.test(sql)],
 ['browser cannot mutate subscription',!/update public\.organization_subscriptions/i.test(sql)],
 ['capacity UX helper',/function subscriptionUsageBlock/i.test(html)],
 ['80 warning',/pct>=80/i.test(html)],
 ['90 warning',/pct>=90/i.test(html)],
 ['100 hard warning',/pct>=100/i.test(html)],
 ['admin billing entry',/Subscription & Billing<\/button>/i.test(html)]
];
let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
