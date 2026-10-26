import fs from 'node:fs';
const installer='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(installer,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const has=n=>refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`));
const fail=[];
for(const n of [2,7,8,16,39]) if(has(n)) fail.push(`phase ${n} must not execute in LIVE pre-cutover installer`);
// Phase 14 explicitly depends on the restrictive tenant fences created by Phase 2.
if(has(14)&&!has(2)) fail.push('phase 14 depends on Phase 2 restrictive tenant fences; cannot execute while Phase 2 is excluded');
if(has(15)) fail.push('phase 15 is a cutover migration and must wait for LIVE recruiter-table compatibility proof');
// Phase 25 account-role policies and Phase 49 commission self-view policy are permissive paths designed to sit behind Phase 2 restrictive fences.
if(refs.includes('MULTI_TENANT_PHASE25_ACCOUNT_ROLE_POLICIES.sql')&&!has(2)) fail.push('Phase 25 account-role policies require Phase 2 restrictive tenant fences');
if(has(49)&&!has(2)) fail.push('Phase 49 commission policy rewrite requires Phase 2 restrictive tenant fences');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation dependency gate');
