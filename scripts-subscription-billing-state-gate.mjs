import fs from 'node:fs';
const s=fs.readFileSync('MULTI_TENANT_PHASE59_SUBSCRIPTION_BILLING_STATE.sql','utf8');
const checks=[
 ['subscription table exists',/organization_subscriptions/.test(s)],
 ['subscription rows are not browser writable',/revoke all on public\.organization_subscriptions from anon,authenticated/.test(s)],
 ['status RPC exists',/cpcm_subscription_status/.test(s)],
 ['platform setter exists',/cpcm_platform_set_subscription_state/.test(s)],
 ['platform setter requires platform admin',/if not private\.is_platform_admin\(\)/.test(s)],
 ['active subscription activates tenant',/when 'active' then 'active'/.test(s)],
 ['past due blocks tenant',/when 'past_due' then 'past_due'/.test(s)],
 ['cancelled blocks tenant',/when 'cancelled' then 'cancelled'/.test(s)],
 ['demo cannot be overwritten by billing',/coalesce\(is_demo,false\)=false/.test(s)]
];let bad=false;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);bad ||= !ok}if(bad)process.exit(1);
