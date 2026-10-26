import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

// LOCAL/STATIC ONLY. This runner must never connect to LIVE, execute SQL, deploy,
// install cron, merge branches, or perform provider mutations/charges.
const gates = [
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
  'scripts-production-runtime-config-integrity-gate.mjs',
  'scripts-production-deployment-readiness-gate.mjs',
  'scripts-production-rollback-plan-gate.mjs',
  'scripts-production-release-evidence-gate.mjs',
  'scripts-production-release-envelope-gate.mjs'
];

for (const gate of gates) {
  if (!fs.existsSync(gate)) {
    console.error(`FAIL production release preflight — missing ${gate}`);
    process.exit(1);
  }
  console.log(`\n=== ${gate} ===`);
  const r = spawnSync(process.execPath, [gate], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nFAIL production release preflight — stopped at ${gate}`);
    process.exit(r.status || 1);
  }
}
console.log(`\nPASS production release preflight — ${gates.length} local/static release gates passed; no LIVE action executed`);
