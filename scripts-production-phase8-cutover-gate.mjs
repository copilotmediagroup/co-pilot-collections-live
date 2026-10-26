import fs from 'node:fs';
const installer=fs.readFileSync('PRODUCTION_PHASE8_CUTOVER_INSTALL.sql','utf8');
const post=fs.readFileSync('PRODUCTION_PHASE8_POST_CUTOVER_GATE.sql','utf8');
const phase8=fs.readFileSync('MULTI_TENANT_PHASE8_REMOVE_LEGACY_DEFAULTS.sql','utf8');
const foundation=fs.readFileSync('MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql','utf8');
const fail=[];
if(!installer.includes('\\ir MULTI_TENANT_PHASE8_REMOVE_LEGACY_DEFAULTS.sql')) fail.push('Phase 8 wrapper must include only canonical Phase 8 migration');
if((installer.match(/^\\ir /gm)||[]).length!==1) fail.push('Phase 8 wrapper must contain exactly one SQL include');
if(foundation.includes('MULTI_TENANT_PHASE8_REMOVE_LEGACY_DEFAULTS.sql')) fail.push('Phase 8 must never be chained into foundation installer');
for(const phrase of ['Agency A/B behavioral isolation proof','explicit owner authorization','all production writers']) if(!installer.includes(phrase)) fail.push(`Phase 8 prerequisite missing: ${phrase}`);
if(!/^begin;/mi.test(phase8)||!/^commit;/mi.test(phase8)) fail.push('canonical Phase 8 migration must be transactional');
if(!/BEGIN READ ONLY;/i.test(post)||!/ROLLBACK;/i.test(post)) fail.push('post-Phase8 gate must be read-only and rollback');
if(!post.includes("column_default IS NOT NULL")) fail.push('post-Phase8 gate must verify defaults are absent');
if(!post.includes("permissive='RESTRICTIVE'")) fail.push('post-Phase8 gate must verify restrictive tenant fences');
if(/\b(?:insert\s+into|update\s+|delete\s+from|alter\s+table|create\s+(?:table|policy|function|trigger|index)|drop\s+(?:table|policy|function|trigger|index)|truncate\s+)/i.test(post.replace(/--.*$/gm,''))) fail.push('post-Phase8 gate contains mutation SQL');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production Phase 8 cutover gate — isolated installer, explicit behavioral/owner holds, read-only post-cutover verification');
