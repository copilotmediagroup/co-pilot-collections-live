import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE61_SAAS_PLAN_CATALOG.sql','utf8');
const checks=[
 ['plan catalog exists',/create table if not exists public\.saas_plan_catalog/i],
 ['starter exact pricing',/\('starter','Starter',29900,299000,5,5000,10,true/i],
 ['professional exact pricing',/\('professional','Professional',59900,599000,15,25000,20,true/i],
 ['agency pro exact pricing',/\('agency_pro','Agency Pro',99900,999000,40,100000,30,true/i],
 ['monthly annual interval enforced',/billing_interval in \('monthly','annual'\)/i],
 ['catalog browser write access revoked',/revoke all on public\.saas_plan_catalog from public,anon,authenticated/i],
 ['only active catalog is browser readable',/using \(is_active=true\)/i],
 ['catalog rpc exists',/function public\.cpcm_saas_plan_catalog\(\)/i]
];
let bad=0;for(const [name,re] of checks){const ok=re.test(sql);console.log(ok?'PASS':'FAIL',name);if(!ok)bad++;}process.exit(bad?1:0);
