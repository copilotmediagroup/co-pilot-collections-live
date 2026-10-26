import fs from 'node:fs';
const file='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(file,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const fail=[];
if(!s.includes('\\set ON_ERROR_STOP on')) fail.push('ON_ERROR_STOP missing');
if(refs.length!==52) fail.push(`expected 54 LIVE SQL includes, got ${refs.length}`);
for(const r of refs) if(!fs.existsSync(r)) fail.push(`missing ${r}`);
if(refs.some(r=>/DEMO/.test(r))) fail.push('demo SQL included');
if(refs.some(r=>/STAGING_BUNDLE/.test(r))) fail.push('staging bundle included');
if(refs.some(r=>/PHASE8_REMOVE_LEGACY_DEFAULTS/.test(r))) fail.push('phase8 included before isolation');
if(refs.some(r=>/PHASE16_STAGING_READINESS/.test(r))) fail.push('phase16 staging readiness included in LIVE installer');
if(refs.some(r=>/PHASE39/.test(r))) fail.push('phase39 mutation unexpectedly included');
for(let n=1;n<=56;n++){ if(n===2||n===7||n===8||n===16||n===39) continue; if(!refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`))) fail.push(`phase ${n} absent`); }
for(const f of ['MULTI_TENANT_PHASE25_TRUSTED_TENANT_STAMP.sql','MULTI_TENANT_PHASE25_ACCOUNT_ROLE_POLICIES.sql']) if(!refs.includes(f)) fail.push(`${f} absent`);
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation installer gate — 52 LIVE SQL files, Phase 2/7/16 staging artifacts excluded, Phase 8 held, Phase 39 runtime-only');
