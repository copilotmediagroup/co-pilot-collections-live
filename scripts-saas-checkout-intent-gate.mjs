import fs from 'node:fs';const s=fs.readFileSync('MULTI_TENANT_PHASE63_SAAS_CHECKOUT_INTENT.sql','utf8');
const checks=[
 ['gateway billing fields exist',/gateway_customer_id text[\s\S]*gateway_subscription_id text/i],
 ['period fields exist',/current_period_start timestamptz[\s\S]*current_period_end timestamptz/i],
 ['checkout rpc exists',/cpcm_my_subscription_checkout\(\)/i],
 ['checkout requires auth',/Authentication required/i],
 ['checkout requires agency admin',/member_role not in \('agency_admin','admin'\)/i],
 ['demo excluded',/coalesce\(o\.is_demo,false\)=false/i],
 ['amount derived from canonical catalog',/case selected_interval when 'annual' then p\.annual_price_cents else p\.monthly_price_cents end/i],
 ['browser cannot pass an amount',!/cpcm_my_subscription_checkout\([^)]*amount/i.test(s)],
 ['anon cannot call checkout rpc',/revoke all on function public\.cpcm_my_subscription_checkout\(\) from public,anon/i]
];let bad=0;for(const [n,r] of checks){const ok=typeof r==='boolean'?r:r.test(s);console.log(ok?'PASS':'FAIL',n);if(!ok)bad++;}process.exit(bad?1:0);
