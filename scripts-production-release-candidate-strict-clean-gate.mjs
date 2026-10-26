import fs from 'node:fs';
const f='scripts-production-release-candidate-gate.mjs';
const s=fs.readFileSync(f,'utf8');
const fail=[];
if(!s.includes("const changes=status.split('\\n').filter(Boolean);")) fail.push('candidate gate must inspect every porcelain status entry');
if(!s.includes("if(changes.length) fail.push('working tree is not clean');")) fail.push('candidate gate must reject every dirty-tree state');
for(const bad of ['selfChanges','PRODUCTION_CUTOVER_SEQUENCE.md\')','scripts-production-release-envelope-gate.mjs\')','scripts-production-release-candidate-gate.mjs\')']) if(s.includes(bad)) fail.push('candidate gate contains a self-edit dirty-tree bypass: '+bad);
if(!s.includes("if(remote && head!==remote) fail.push('local HEAD does not exactly match origin feature branch');")) fail.push('remote SHA equality check missing');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production release candidate strict-clean gate — no file exemptions can bypass the clean-tree release freeze');
