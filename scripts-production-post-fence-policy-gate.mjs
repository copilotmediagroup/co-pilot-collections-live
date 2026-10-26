import fs from 'node:fs';
const install=fs.readFileSync('PRODUCTION_POST_FENCE_POLICY_INSTALL.sql','utf8');
const verify=fs.readFileSync('PRODUCTION_POST_FENCE_POLICY_GATE.sql','utf8');
const foundation=fs.readFileSync('MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql','utf8');
const phase8=fs.readFileSync('PRODUCTION_PHASE8_CUTOVER_INSTALL.sql','utf8');
const expected=['MULTI_TENANT_PHASE14_LEGACY_POLICY_CLEANUP.sql','MULTI_TENANT_PHASE25_ACCOUNT_ROLE_POLICIES.sql','MULTI_TENANT_PHASE49_CANONICAL_ACTOR_IDENTITY.sql'];
const fail=[];
const includes=[...(install.matchAll(/^\\ir\s+(\S+)/gm))].map(m=>m[1]);
if(JSON.stringify(includes)!==JSON.stringify(expected)) fail.push('post-fence installer order/content must be exactly Phase 14, Phase 25 account policies, Phase 49');
for(const f of expected){ if(foundation.includes(f)) fail.push(`${f} must remain outside pre-fence foundation`); }
if(!/BEGIN READ ONLY;/i.test(verify)||!/ROLLBACK;/i.test(verify)) fail.push('verification gate must be read-only and rollback');
if(!verify.includes("permissive='RESTRICTIVE'")) fail.push('verification must prove restrictive tenant fence');
if(!verify.includes('PHASE 8 REMAINS HOLD')) fail.push('verification must keep Phase 8 held for behavioral proof');
if(!phase8.includes('Agency A/B behavioral isolation proof')) fail.push('Phase 8 must still require behavioral isolation proof');
if(/\b(?:insert\s+into|update\s+|delete\s+from|alter\s+table|create\s+(?:table|policy|function|trigger|index)|drop\s+(?:table|policy|function|trigger|index)|truncate\s+)/i.test(verify.replace(/--.*$/gm,''))) fail.push('verification gate contains mutation SQL');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production post-fence feature-policy gate — held permissive policies install only after restrictive tenant fence and Phase 8 remains held');
