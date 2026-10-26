import fs from 'node:fs';
const installer='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(installer,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const has=n=>refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`));
const fail=[];
for(const n of [2,7,8,16,39]) if(has(n)) fail.push(`phase ${n} must not execute in LIVE pre-cutover installer`);
// Phase 14 is deliberately held for the separate production post-fence policy stage.
if(has(14)) fail.push('phase 14 must remain outside foundation and run only after the production tenant fence passes');
if(has(15)) fail.push('phase 15 is a cutover migration and must wait for LIVE recruiter-table compatibility proof');
// Phase 25 account-role policies and Phase 49 commission self-view policy are permissive paths designed to sit behind the production restrictive tenant fence.
if(refs.includes('MULTI_TENANT_PHASE25_ACCOUNT_ROLE_POLICIES.sql')) fail.push('Phase 25 account-role policies must remain outside foundation until the production tenant fence passes');
if(has(49)) fail.push('Phase 49 commission policy rewrite must remain outside foundation until the production tenant fence passes');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation dependency gate');
