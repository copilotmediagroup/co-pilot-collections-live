import fs from 'node:fs';
const installer='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(installer,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const has=n=>refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`));
const fail=[];
for(const n of [2,7,8,16,39]) if(has(n)) fail.push(`phase ${n} must not execute in LIVE pre-cutover installer`);
// Phase 14 explicitly depends on the restrictive tenant fences created by Phase 2.
if(has(14)&&!has(2)) fail.push('phase 14 depends on Phase 2 restrictive tenant fences; cannot execute while Phase 2 is excluded');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation dependency gate');
