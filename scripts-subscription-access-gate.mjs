import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE57_SUBSCRIPTION_ACCESS_GATE.sql','utf8');
const checks=[
 ['status supports pending payment',/pending_payment/.test(sql)],
 ['status supports past due',/past_due/.test(sql)],
 ['normal resolver allows only active or demo',/o\.status in \('active','demo'\)/.test(sql)],
 ['production provisioning starts pending payment',/then 'demo' else 'pending_payment'/.test(sql)],
 ['provisioning rejects prior membership',/already has an organization membership/.test(sql)],
 ['platform admin required for provisioning',/if not private\.is_platform_admin\(\)/.test(sql)],
 ['lifecycle setter supports payment states',/pending_payment','active','past_due','suspended','cancelled','demo/.test(sql)]
];
let bad=false; for(const [name,ok] of checks){console.log((ok?'PASS ':'FAIL ')+name);if(!ok)bad=true} if(bad)process.exit(1);
