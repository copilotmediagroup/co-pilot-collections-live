import fs from 'node:fs';
const f='PRODUCTION_TENANT_ISOLATION_PROOF.sql';
const s=fs.readFileSync(f,'utf8');
const fail=[];
for(const x of ['BEGIN;','ROLLBACK;','SET LOCAL ROLE authenticated','cpcm_tenant_select','cpcm_tenant_insert','cpcm_tenant_update','cpcm_tenant_delete','FAIL A SELECT B','FAIL A UPDATE B','FAIL A DELETE B','FAIL B SELECT A','forged tenant stamp','platform admin cross-tenant inspection']) if(!s.includes(x)) fail.push('missing isolation proof control: '+x);
if(!s.includes("SELECT id::text AS a_user")||!s.includes("SELECT id::text AS b_user")) fail.push('must use existing auth users, not create production auth identities');
if(/insert\s+into\s+auth\.users/i.test(s)) fail.push('must never create auth users');
if(!/CREATE TEMPORARY TABLE cpcm_production_stamp_probe/i.test(s)) fail.push('tenant stamping must use temporary probe, not business-row insert');
if(!s.includes('no changes committed')||!s.includes('all changes rolled back')) fail.push('rollback guarantee must be explicit');
const phase8=fs.readFileSync('PRODUCTION_PHASE8_CUTOVER_INSTALL.sql','utf8');
if(!phase8.includes('Agency A/B behavioral isolation proof')) fail.push('Phase 8 must continue to require behavioral isolation proof');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production tenant isolation proof gate — rollback-only A/B behavioral test is explicit and Phase 8 remains dependent on it');
