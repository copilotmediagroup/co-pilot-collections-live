import fs from 'node:fs';const s=fs.readFileSync('MULTI_TENANT_PHASE62_SUBSCRIPTION_SELECTION.sql','utf8');
const c=[
['selection rpc exists',/cpcm_select_subscription_plan\(p_plan_code text,p_billing_interval text\)/i],
['requires authentication',/Authentication required/i],
['requires agency admin',/member_role not in \('agency_admin','admin'\)/i],
['demo excluded',/coalesce\(o\.is_demo,false\)=false/i],
['interval validated',/clean_interval not in \('monthly','annual'\)/i],
['price comes from catalog',/p\.annual_price_cents.*p\.monthly_price_cents/i],
['selection stays pending payment',/values\(oid,clean_plan,'pending_payment',clean_interval/i],
['browser can call constrained selector',/grant execute on function public\.cpcm_select_subscription_plan\(text,text\) to authenticated/i]
];let n=0;for(const [x,r] of c){let o=r.test(s);console.log(o?'PASS':'FAIL',x);if(!o)n++;}process.exit(n?1:0);
