import fs from 'node:fs';
const file='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(file,'utf8');
const refs=[...s.matchAll(/^\\ir (.+)$/gm)].map(m=>m[1]);
const excluded=[2,7,8,14,15,16,39,49];
for(const n of excluded){if(refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`))) throw new Error(`Phase ${n} must not execute in LIVE pre-cutover installer`);}
for(let n=1;n<=56;n++){if(excluded.includes(n)) continue; if(!refs.some(r=>r.startsWith(`MULTI_TENANT_PHASE${n}_`))) throw new Error('missing production phase '+n);}
if(refs.some(r=>/MULTI_TENANT_DEMO_|STAGING_BUNDLE/.test(r))) throw new Error('demo/staging bundle SQL must not execute in LIVE installer');
if(!s.includes('Phase 2, Phase 7 and Phase 16 are staging/readiness artifacts')) throw new Error('staging exclusion rationale missing');
const p3=fs.readFileSync('MULTI_TENANT_PHASE3_TENANT_KEYS_AND_TEST_HARNESS.sql','utf8');
if(!p3.includes('begin;')||!p3.includes('commit;')||!p3.includes('-- TEST HARNESS SETUP')) throw new Error('Phase 3 mutation/harness boundary changed');
console.log('PASS production foundation LIVE-safety gate — Phase 2/7/14/15/16/49 excluded, Phase 8 held, Phase 39 runtime-only, Phase 3 mutation-only execution understood');
