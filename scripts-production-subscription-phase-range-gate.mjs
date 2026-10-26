import fs from 'node:fs';
const fail=[];
const manifest='MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql';
const text=fs.readFileSync(manifest,'utf8');
const phases=[...text.matchAll(/MULTI_TENANT_PHASE(\d+)_/g)].map(m=>Number(m[1]));
const expected=Array.from({length:45},(_,i)=>57+i);
if(JSON.stringify(phases)!==JSON.stringify(expected)) fail.push(`subscription manifest must contain every phase 57-101 exactly once; got ${phases.join(',')}`);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const verify=pkg.scripts?.['release:verify']||'';
if(!verify.includes('scripts-production-subscription-gates-57-101.mjs')) fail.push('release:verify is not pinned to the 57-101 subscription gate runner');
if(verify.includes('57-97')) fail.push('release:verify still references stale 57-97 runner');
for(const f of ['scripts-production-release-candidate-gate.mjs','scripts-production-release-command-gate.mjs','scripts-production-subscription-installer-gate.mjs']){
 const s=fs.readFileSync(f,'utf8');
 if(s.includes('57-97')||s.includes('ends at phase97')||s.includes('41 subscription phases')) fail.push(`${f} contains stale Phase97-era release language`);
}
if(fail.length){console.error('FAIL production subscription phase range gate\n- '+fail.join('\n- '));process.exit(1)}
console.log('PASS production subscription phase range gate — canonical manifest and release verification pinned to every phase 57-101');
