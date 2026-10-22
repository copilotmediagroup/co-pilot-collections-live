import fs from 'node:fs';
const s=fs.readFileSync('supabase/functions/saas-subscription-checkout/index.ts','utf8');
const checks=[
 ['official v5 subscription endpoint',s.includes('gateway("/api/v5/subscriptions"')],
 ['uses Collect.js payment token',s.includes('payment_details:{payment_token:paymentToken}')],
 ['canonical amount becomes plan amount',s.includes('plan_amount:Number((Number(c.amount_cents)/100).toFixed(2))')],
 ['monthly cadence',s.includes('interval==="annual"?12:1')],
 ['until cancelled',s.includes('plan_payments:0')],
 ['start date supplied',s.includes('start_date:ymd(start)')],
 ['private key stays server env',s.includes('Deno.env.get("NMI_PRIVATE_API_KEY")')],
 ['no configurable invented recurring endpoint',!s.includes('NMI_SAAS_RECURRING_ENDPOINT')],
 ['raw card fields absent',!/(card_number|card_cvv|ccnumber|ccexp)/.test(s)]
];
let bad=false;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);bad ||= !ok}if(bad)process.exit(1);
