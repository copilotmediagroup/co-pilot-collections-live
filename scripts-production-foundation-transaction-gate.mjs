import fs from 'node:fs';
const installer='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(installer,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const fail=[];
for(const f of refs){
 const x=fs.readFileSync(f,'utf8');
 if(!/^\s*begin\s*;/im.test(x)||!/^\s*commit\s*;/im.test(x)) fail.push(`${f}: missing explicit transaction`);
 if(/create\s+index\s+concurrently|reindex\s+[^;]*concurrently|^\s*vacuum\b|^\s*create\s+database\b|^\s*alter\s+system\b/im.test(x)) fail.push(`${f}: transaction-incompatible statement`);
}
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log(`PASS production foundation transaction gate — ${refs.length} included SQL files are explicitly transactional and no known transaction-incompatible statements were found`);
