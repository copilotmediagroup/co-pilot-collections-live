import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE64_SUBSCRIPTION_CHECKOUT_AUDIT.sql','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks=[
 ['checkout audit table exists',/create table if not exists public\.subscription_checkout_attempts/i.test(sql)],
 ['checkout table browser locked',/revoke all on public\.subscription_checkout_attempts from public,anon,authenticated/i.test(sql)],
 ['prepare rpc requires auth',/if uid is null then raise exception 'Authentication required'/i.test(sql)],
 ['prepare rpc requires admin',/member_role not in \('agency_admin','admin'\)/i.test(sql)],
 ['demo excluded',/coalesce\(o\.is_demo,false\)=false/i.test(sql)],
 ['amount from catalog',/annual_price_cents else p\.monthly_price_cents/i.test(sql)],
 ['checkout audit has no card fields',!/(card_number|cvv|cvc|payment_token)/i.test(sql)],
 ['frontend uses audited checkout rpc',html.includes("/rpc/cpcm_prepare_subscription_checkout")],
 ['frontend renders checkout summary',html.includes('renderSaasCheckout')&&html.includes('Secure Subscription Checkout')],
 ['frontend re-verifies before gateway',html.includes('Verifying subscription checkout')&&html.includes('Subscription selection changed')]
];
let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++;}if(bad)process.exit(1);
