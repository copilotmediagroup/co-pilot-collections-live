import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE79_PAST_DUE_BILLING_RECOVERY.sql','utf8');
const app=fs.readFileSync('index.html','utf8');
const checks=[
 ['access state exposes grace',/cpcm_my_organization_access_state[\s\S]*grace_period_ends_at/i.test(sql)],
 ['billing recovery rpc',/cpcm_past_due_billing_recovery/i.test(sql)],
 ['admin required',/Agency admin required/i.test(sql)],
 ['past due only',/s\.status='past_due'/i.test(sql)],
 ['demo excluded',/is_demo,false\)=false/i.test(sql)],
 ['browser cannot mutate subscription',!/update public\.organization_subscriptions/i.test(sql)],
 ['operational gate remains',/Billing must be brought current before operational access can resume/i.test(app)],
 ['grace date surfaced',/grace_period_ends_at/.test(app)],
 ['billing recovery guidance',/Subscription & Billing to resolve billing/.test(app)]
];let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
