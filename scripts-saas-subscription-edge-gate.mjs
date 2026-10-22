import fs from 'node:fs';const sql=fs.readFileSync('MULTI_TENANT_PHASE65_SUBSCRIPTION_CHECKOUT_CLAIM.sql','utf8'),edge=fs.readFileSync('supabase/functions/saas-subscription-checkout/index.ts','utf8');const c=[
['claim is service-only',/Service role required/i.test(sql)&&/grant execute on function public\.cpcm_service_claim_subscription_checkout\(uuid\) to service_role/i.test(sql)],
['claim only prepared checkout',/status='prepared'/i.test(sql)],
['finalizer restricts terminal states',/clean not in \('paid','failed','cancelled'\)/i.test(sql)],
['edge authenticates user JWT',/admin\.auth\.getUser\(jwt\)/.test(edge)],
['edge requires checkout and token',/secure payment token are required/i.test(edge)],
['edge claims server canonical checkout',/cpcm_service_claim_subscription_checkout/.test(edge)],
['edge does not hardcode recurring endpoint',/NMI_SAAS_RECURRING_ENDPOINT/.test(edge)&&/No charge was attempted/.test(edge)],
['edge sends canonical server amount',/Number\(c\.amount_cents\)/.test(edge)],
['browser contains no private key value',!/(?:NMI_PRIVATE_API_KEY)\s*[:=]\s*["\'][A-Za-z0-9_-]{20,}/i.test(fs.readFileSync('index.html','utf8'))]
];let bad=0;for(const [n,ok] of c){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++;}process.exit(bad?1:0);
