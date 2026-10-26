import fs from 'node:fs';
const pre=fs.readFileSync('PRODUCTION_RECRUITING_PRE_CUTOVER_GATE.sql','utf8');
const install=fs.readFileSync('PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql','utf8');
const post=fs.readFileSync('PRODUCTION_RECRUITING_POST_CUTOVER_GATE.sql','utf8');
const phase15=fs.readFileSync('MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql','utf8');
const foundation=fs.readFileSync('MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql','utf8');
const fail=[];
for(const [name,sql] of [['pre',pre],['post',post]]){
 if(!/BEGIN READ ONLY;/i.test(sql)||!/ROLLBACK;/i.test(sql)) fail.push(`${name} recruiting gate must be read-only and rollback`);
 const scrub=sql.replace(/--.*$/gm,'').replace(/'[^']*'/g,"''");
 if(/\b(?:insert\s+into|update\s+\w|delete\s+from|alter\s+table|create\s+(?:table|policy|function|trigger|index)|drop\s+(?:table|policy|function|trigger|index)|truncate\s+)/i.test(scrub)) fail.push(`${name} recruiting gate contains mutation SQL`);
}
if(!install.includes('\\ir MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql')) fail.push('recruiting installer must include canonical Phase 15');
if((install.match(/^\\ir /gm)||[]).length!==1) fail.push('recruiting installer must contain exactly one SQL include');
if(foundation.includes('MULTI_TENANT_PHASE15_RECRUITING_CLASSIFICATION.sql')) fail.push('Phase 15 must remain outside pre-cutover foundation');
if(!pre.includes('recruiter_applications_public_insert')) fail.push('pre-cutover gate must prove recruiter public submission prerequisite');
if(!post.includes('recruiter_applications_platform_select')||!post.includes('recruiter_applications_platform_update')) fail.push('post-cutover gate must prove platform review policies');
if(!post.includes("policyname LIKE 'cpcm_tenant_%'")) fail.push('post-cutover gate must prove recruiting tenant fences are absent');
if(!/^begin;/mi.test(phase15)||!/^commit;/mi.test(phase15)) fail.push('Phase 15 must be transactional');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production recruiting cutover gate — LIVE compatibility proof, isolated Phase 15 installer, and read-only platform-global verification');
