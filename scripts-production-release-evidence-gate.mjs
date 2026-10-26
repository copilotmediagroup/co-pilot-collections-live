import fs from 'node:fs';
const f='PRODUCTION_RELEASE_EVIDENCE_TEMPLATE.md';
const s=fs.readFileSync(f,'utf8');
const fail=[];
for(const x of [
  'Release commit SHA:',
  'LIVE project reference:',
  'Prior known-good application deploy identifier:',
  'Database recovery point / backup reference:',
  'PRODUCTION_FOUNDATION_PRE_MUTATION_COMPATIBILITY.sql',
  'MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql',
  'PRODUCTION_TENANT_FENCE_INSTALL.sql',
  'PRODUCTION_TENANT_ISOLATION_PROOF.sql',
  'scripts-production-writer-tenant-context-gate.mjs',
  'PRODUCTION_PHASE8_CUTOVER_INSTALL.sql',
  'MULTI_TENANT_PRODUCTION_SUBSCRIPTION_INSTALL_57_101.sql',
  'Six Edge Functions deployed from release SHA',
  'Three Vault-backed cron jobs installed/verified',
  'Duplicate provider mutation observed:',
  'Cross-tenant negative smoke:',
  'Any unresolved partial migration state:',
  'Any cross-tenant visibility observed:',
  'Any duplicate provider mutation risk:'
]) if(!s.includes(x)) fail.push('missing release evidence field: '+x);
if(!/Do not place credentials, private\/service keys, payment tokens, raw payment data, or database passwords/i.test(s)) fail.push('secret/payment-data exclusion warning missing');
if(!s.includes('UTC start')||!s.includes('UTC end')) fail.push('UTC timing evidence missing');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production release evidence gate — stage-by-stage audit trail, recovery/deploy references, smoke evidence and secret exclusions locked');
