import fs from 'node:fs';

const fail=[];
const runnerFile='scripts-production-release-preflight.mjs';
const envelopeFile='scripts-production-release-envelope-gate.mjs';
const commandGateFile='scripts-production-release-command-gate.mjs';
const runner=fs.readFileSync(runnerFile,'utf8');
const envelope=fs.readFileSync(envelopeFile,'utf8');
const commandGate=fs.readFileSync(commandGateFile,'utf8');

const runnerMatch=runner.match(/const gates = \[([\s\S]*?)\n\];/);
const envelopeMatch=envelope.match(/const requiredStatic=\[([\s\S]*?)\n\];/);
if(!runnerMatch) fail.push('cannot parse release preflight gate list');
if(!envelopeMatch) fail.push('cannot parse release envelope gate list');

const extract = body => [...body.matchAll(/'([^']+\.mjs)'/g)].map(m=>m[1]);
const runnerGates=runnerMatch?extract(runnerMatch[1]):[];
const envelopeGates=envelopeMatch?extract(envelopeMatch[1]):[];

if(new Set(runnerGates).size!==runnerGates.length) fail.push('release preflight contains duplicate gates');
if(runnerGates.includes(runnerFile)) fail.push('release preflight must not recursively invoke itself');
if(runnerGates.includes('scripts-production-release-runner-integrity-gate.mjs')) fail.push('release preflight must not invoke runner integrity gate recursively');

const expected=[...envelopeGates.filter(x=>x!==runnerFile && x!=='scripts-production-release-runner-integrity-gate.mjs'),'scripts-production-release-envelope-gate.mjs'];
for(const gate of expected) if(!runnerGates.includes(gate)) fail.push('release preflight missing envelope gate: '+gate);
for(const gate of runnerGates) if(!expected.includes(gate)) fail.push('release preflight contains untracked gate: '+gate);

for(const forbidden of ['psql ','supabase db','supabase functions deploy','netlify deploy','git merge','git push origin main','curl ','NMI_PRIVATE_API_KEY']) {
  if(runner.toLowerCase().includes(forbidden.toLowerCase())) fail.push('release preflight contains forbidden LIVE/deploy/provider action: '+forbidden);
}
if(!runner.includes('no LIVE action executed')) fail.push('release preflight must state that no LIVE action executes');
if(!commandGate.includes("release:preflight")) fail.push('release command gate must protect release:preflight');
if(!commandGate.includes("release:verify")) fail.push('release command gate must protect release:verify');

if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log(`PASS production release runner integrity gate — ${runnerGates.length} preflight gates exactly match the release envelope and remain verification-only`);
