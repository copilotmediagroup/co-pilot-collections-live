import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
const fail=[];
const pre=p.scripts?.['release:preflight']||'';
const verify=p.scripts?.['release:verify']||'';
if(pre!=='node scripts-production-release-preflight.mjs') fail.push('release:preflight must run only the local/static production preflight');
for(const x of ['npm run release:preflight','node scripts-production-subscription-gates-57-97.mjs','node scripts-multitenant-local-preflight.mjs','npm run build']) if(!verify.includes(x)) fail.push('release:verify missing: '+x);
for(const forbidden of ['supabase db','supabase functions deploy','psql ','netlify deploy','git merge','git push origin main','curl ','NMI_PRIVATE_API_KEY']) {
  if((pre+'\n'+verify).toLowerCase().includes(forbidden.toLowerCase())) fail.push('release command contains forbidden LIVE/deploy/provider action: '+forbidden);
}
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production release command gate — npm release commands are verification-only and contain no LIVE/deploy/provider actions');
