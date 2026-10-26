import fs from 'node:fs';
const doc=fs.readFileSync('PRODUCTION_CUTOVER_SEQUENCE.md','utf8');
const fail=[];
const ordered=[
 'PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql',
 'MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql',
 'PRODUCTION_FOUNDATION_POST_INSTALL_PRE_PHASE8_GATE.sql',
 'PRODUCTION_RECRUITING_PRE_CUTOVER_GATE.sql',
 'PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql',
 'PRODUCTION_RECRUITING_POST_CUTOVER_GATE.sql',
 'PRODUCTION_TENANT_FENCE_INSTALL.sql',
 'PRODUCTION_TENANT_FENCE_POST_INSTALL_GATE.sql',
 'PRODUCTION_POST_FENCE_POLICY_INSTALL.sql',
 'PRODUCTION_POST_FENCE_POLICY_GATE.sql',
 'PRODUCTION_TENANT_ISOLATION_PROOF.sql',
 'PRODUCTION_PHASE8_CUTOVER_INSTALL.sql',
 'PRODUCTION_PHASE8_POST_CUTOVER_GATE.sql',
 'MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql'
];
let last=-1;
for(const f of ordered){
 if(!fs.existsSync(f)) fail.push(`missing cutover artifact: ${f}`);
 const i=doc.indexOf('`'+f+'`');
 if(i<0) fail.push(`sequence omits: ${f}`);
 else if(i<=last) fail.push(`sequence order invalid at: ${f}`);
 else last=i;
}
for(const phrase of ['explicit owner authorization','rollback-only','Never run Phase 8','Never install subscription phases','Never use Demo/staging installers']) if(!doc.includes(phrase)) fail.push(`missing stop rule: ${phrase}`);
if(!/six production subscription Edge Functions/i.test(doc)) fail.push('sequence must require six subscription edge functions');
if(!/three production subscription cron jobs/i.test(doc)) fail.push('sequence must require three subscription cron jobs');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log(`PASS production cutover sequence gate — ${ordered.length} ordered artifacts, LIVE stop rules, subscription deploy boundary`);
