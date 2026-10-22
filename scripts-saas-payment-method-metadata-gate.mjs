import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE80_SAAS_PAYMENT_METHOD_METADATA.sql','utf8');
const ui=fs.readFileSync('index.html','utf8');
const checks=[
 ['payment method metadata table',/saas_subscription_payment_methods/],
 ['no raw card columns',!/(card_number|\bpan\s+(text|varchar)|cvv|cvc|security_code)/i.test(sql.replace(/--.*$/gm,''))],
 ['last4 constrained',/final four card digits|\^\[0-9\]\{4\}\$/],
 ['service upsert',/cpcm_service_upsert_saas_payment_method/],
 ['service role required',/Service role required/],
 ['demo protected',/Demo organizations do not have production subscription payment methods/],
 ['table browser revoked',/revoke all on public\.saas_subscription_payment_methods from public,anon,authenticated/],
 ['admin masked reader',/cpcm_my_saas_payment_method/],
 ['admin required',/Agency admin required/],
 ['reader excludes provider customer id',/returns table\(provider text,brand text,last4 text,exp_month integer,exp_year integer,status text,updated_at timestamptz\)/],
 ['billing UI loads masked method',/loadSaasPaymentMethod/],
 ['billing UI masks last4',/••••/]
];
let bad=0;for(const [n,t] of checks){let ok=typeof t==='boolean'?t:t.test(sql+'\n'+ui);console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad++}process.exit(bad?1:0);
