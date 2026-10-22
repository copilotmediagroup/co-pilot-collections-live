import fs from 'node:fs';
const s=fs.readFileSync('MULTI_TENANT_PHASE71_SUBSCRIPTION_LIFECYCLE_SERVICE.sql','utf8');
const checks=[
 ['lifecycle service rpc',/function public\.cpcm_service_apply_subscription_lifecycle/i],
 ['service role required',/auth\.role\(\).*service_role/i],
 ['only lifecycle states',/not in \('active','past_due','cancelled'\)/i],
 ['demo protected',/Demo organizations do not have production subscriptions/i],
 ['subscription synchronized',/update public\.organization_subscriptions/i],
 ['organization synchronized',/update public\.organizations/i],
 ['past due locks org',/when 'past_due' then 'past_due'/i],
 ['cancelled locks org',/else 'cancelled'/i],
 ['browser revoked',/revoke all on function public\.cpcm_service_apply_subscription_lifecycle[\s\S]*authenticated/i],
 ['service granted',/grant execute on function public\.cpcm_service_apply_subscription_lifecycle[\s\S]*service_role/i],
 ['provider ids retained',/provider_subscription_id=coalesce/i],
 ['period end synchronized',/current_period_end=coalesce/i]
];
let bad=0;for(const [n,r] of checks){const ok=r.test(s);console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}if(bad)process.exit(1);
