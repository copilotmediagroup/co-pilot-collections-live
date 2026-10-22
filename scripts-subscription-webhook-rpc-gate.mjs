import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE60_SUBSCRIPTION_WEBHOOK_RPC.sql','utf8');
const checks=[
 ['service subscription setter exists',/function public\.cpcm_service_set_subscription_state/],
 ['setter requires service role',/auth\.role\(\)\) <> 'service_role'/],
 ['browser roles explicitly revoked',/revoke all on function public\.cpcm_service_set_subscription_state[\s\S]*from public,anon,authenticated/],
 ['service role alone receives execute',/grant execute on function public\.cpcm_service_set_subscription_state[\s\S]*to service_role/],
 ['demo billing mutation blocked',/Demo organizations are not managed by subscription billing/],
 ['subscription row is upserted',/insert into public\.organization_subscriptions/],
 ['organization lifecycle follows billing',/update public\.organizations set plan=clean_plan,status=clean_status/]
];
let failed=0;for(const [name,re] of checks){const ok=re.test(sql);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);
