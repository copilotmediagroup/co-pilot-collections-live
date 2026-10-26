import fs from 'node:fs';
const f='PRODUCTION_FOUNDATION_POST_INSTALL_PRE_PHASE8_GATE.sql';
const s=fs.readFileSync(f,'utf8');
const fail=[];
for(const token of ['BEGIN READ ONLY;','ROLLBACK;','HOLD PHASE 8','organization_id_not_null','legacy organization defaults are already absent','tenant fence policies already exist','Agency A/B behavioral isolation proof']) if(!s.includes(token)) fail.push(`missing ${token}`);
if(/\b(insert|update|delete|truncate|alter\s+table|create\s+(table|index|policy|trigger|function)|drop\s+(table|index|policy|trigger|function))\b/i.test(s.replace(/--[^\n]*/g,''))) fail.push('post-install gate contains mutation SQL');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production foundation post-install gate — read-only structural proof keeps Phase 8 fail-closed');
