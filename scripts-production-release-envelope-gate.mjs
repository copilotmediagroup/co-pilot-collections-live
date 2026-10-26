import fs from 'node:fs';
const fail=[];
const cutover=fs.readFileSync('PRODUCTION_CUTOVER_SEQUENCE.md','utf8');
const checklist=fs.readFileSync('MULTI_TENANT_FINAL_PRE_CUTOVER_CHECKLIST.md','utf8');
const sequenceGate=fs.readFileSync('scripts-production-cutover-sequence-gate.mjs','utf8');
const requiredStatic=[
  'scripts-production-foundation-pre-mutation-gate.mjs',
  'scripts-production-foundation-installer-gate.mjs',
  'scripts-production-foundation-dependency-gate.mjs',
  'scripts-production-foundation-transaction-gate.mjs',
  'scripts-production-foundation-live-safety-gate.mjs',
  'scripts-production-foundation-post-install-gate.mjs',
  'scripts-production-recruiting-cutover-gate.mjs',
  'scripts-production-tenant-fence-gate.mjs',
  'scripts-production-post-fence-policy-gate.mjs',
  'scripts-production-tenant-isolation-proof-gate.mjs',
  'scripts-production-writer-tenant-context-gate.mjs',
  'scripts-production-phase8-cutover-gate.mjs',
  'scripts-production-cutover-sequence-gate.mjs',
  'scripts-production-cutover-package-gate.mjs',
  'scripts-production-subscription-release-manifest-gate.mjs',
  'scripts-production-subscription-installer-gate.mjs',
  'scripts-production-subscription-phase-range-gate.mjs',
  'scripts-production-deployment-readiness-gate.mjs',
  'scripts-production-rollback-plan-gate.mjs',
  'scripts-production-release-preflight.mjs',
  'scripts-production-release-runner-integrity-gate.mjs',
  'scripts-production-release-candidate-gate.mjs',
  'scripts-production-release-candidate-strict-clean-gate.mjs',
  'scripts-production-release-evidence-gate.mjs'
];
for(const f of requiredStatic) if(!fs.existsSync(f)) fail.push('missing release gate: '+f);
for(const phrase of [
  'Every LIVE mutation/deployment step requires explicit owner authorization',
  'Never skip a failed gate',
  'Never run Phase 8 before',
  'Never install subscription phases before',
  'Never use Demo/staging installers against LIVE',
  'Never mutate LIVE, deploy Edge Functions/cron, merge main, deploy Netlify, or perform a real charge without explicit owner authorization'
]) if(!cutover.includes(phrase)) fail.push('cutover stop rule missing: '+phrase);
for(const artifact of [
  'PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql',
  'MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql',
  'PRODUCTION_RECRUITING_CUTOVER_INSTALL.sql',
  'PRODUCTION_TENANT_FENCE_INSTALL.sql',
  'PRODUCTION_POST_FENCE_POLICY_INSTALL.sql',
  'PRODUCTION_TENANT_ISOLATION_PROOF.sql',
  'PRODUCTION_PHASE8_CUTOVER_INSTALL.sql',
  'MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql'
]) if(!cutover.includes(artifact)||!fs.existsSync(artifact)) fail.push('canonical cutover artifact missing/unlisted: '+artifact);
if(!cutover.includes('PRODUCTION_CUTOVER_ROLLBACK_PLAN.md')||!fs.existsSync('PRODUCTION_CUTOVER_ROLLBACK_PLAN.md')) fail.push('canonical rollback plan missing/unlinked');
if(!cutover.includes('PRODUCTION_RELEASE_EVIDENCE_TEMPLATE.md')||!fs.existsSync('PRODUCTION_RELEASE_EVIDENCE_TEMPLATE.md')) fail.push('canonical release evidence template missing/unlinked');
if(!checklist.includes('PRODUCTION_CUTOVER_SEQUENCE.md')) fail.push('final checklist must defer to canonical production cutover sequence');
if(!sequenceGate.includes('explicit owner authorization')) fail.push('sequence gate must enforce explicit owner authorization');
if(fail.length){ console.error(fail.map(x=>'FAIL '+x).join('\n')); process.exit(1); }
console.log(`PASS production release envelope — ${requiredStatic.length} static release gates present, canonical cutover artifacts linked, LIVE stop rules locked`);
