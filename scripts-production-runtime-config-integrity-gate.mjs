import fs from 'node:fs';
const fail=[];
const generator=fs.readFileSync('scripts-generate-runtime-config.mjs','utf8');
const readiness=fs.readFileSync('PRODUCTION_DEPLOYMENT_READINESS.md','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const tracked=fs.readFileSync('public/config.js','utf8');
if(!pkg.scripts?.['build']?.includes('build:config')) fail.push('production build must generate/validate runtime config first');
for(const x of ['CPCM_SUPABASE_URL','CPCM_SUPABASE_PUBLISHABLE_KEY','CPCM_DEPLOYMENT_MODE']) if(!generator.includes(x)) fail.push('runtime generator missing '+x);
if(!generator.includes("['live','demo']")) fail.push('deployment mode allowlist missing');
if(!generator.includes("envKey.startsWith('sb_publishable_')")) fail.push('publishable-key validation missing');
if(!/https:\\\/\\\\\/\[\^\/\]\+\\\.supabase\\\.co/.test(generator.replace(/\\/g,'\\\\'))) {
  // Keep the check semantic instead of coupling to exact regex escaping.
  if(!generator.includes('.supabase\\.co')) fail.push('Supabase project URL validation missing');
}
if(!tracked.includes('deploymentMode: "live"')) fail.push('tracked production config must identify live mode');
if(/service_role|secret[_-]?key|NMI_PRIVATE_API_KEY|CPCM_SUBSCRIPTION_LIFECYCLE_SECRET|CPCM_NMI_WEBHOOK_SIGNING_KEY/i.test(tracked)) fail.push('tracked browser config contains server-only secret material/name');
for(const x of ['CPCM_SUPABASE_URL','CPCM_SUPABASE_PUBLISHABLE_KEY']) if(!readiness.includes(x)) fail.push('readiness docs missing '+x);
if(!/Do not place service-role or NMI private credentials in browser/i.test(readiness)) fail.push('readiness browser-secret warning missing');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production runtime config integrity gate — build-time LIVE config is validated and browser config excludes server-only secret classes');
