import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const fail=[];
const sh=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const branch=sh('rev-parse','--abbrev-ref','HEAD');
const head=sh('rev-parse','HEAD');
const status=sh('status','--porcelain');
const changes=status.split('\n').filter(Boolean);
let remote='';
try { remote=sh('rev-parse',`origin/${branch}`); } catch { fail.push(`origin/${branch} is unavailable`); }
if(branch!=='feature/multi-tenant-saas') fail.push(`unexpected release-preparation branch: ${branch}`);
if(changes.length) fail.push('working tree is not clean');
if(remote && head!==remote) fail.push('local HEAD does not exactly match origin feature branch');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.scripts?.['release:verify']!=='npm run release:preflight && node scripts-production-subscription-gates-57-97.mjs && node scripts-multitenant-local-preflight.mjs && npm run build') fail.push('release:verify command drifted');
const seq=fs.readFileSync('PRODUCTION_CUTOVER_SEQUENCE.md','utf8');
for(const x of ['npm run release:verify','Record/pin the exact release commit SHA','working tree is clean','local HEAD matches the remote feature branch']) if(!seq.includes(x)) fail.push(`cutover release-candidate rule missing: ${x}`);
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log(`PASS production release candidate gate — clean ${branch} at ${head.slice(0,7)}, remote matched, release:verify pinned before LIVE authorization`);
