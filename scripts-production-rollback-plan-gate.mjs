import fs from 'node:fs';
const file='PRODUCTION_CUTOVER_ROLLBACK_PLAN.md';
const s=fs.readFileSync(file,'utf8');
const fail=[];
for(const phrase of [
  'does not authorize any LIVE mutation',
  'explicit owner authorization',
  'provider-supported database backup or recovery point',
  'do not run tenant fence, Phase 8, or subscriptions',
  'The isolation proof itself ends in `ROLLBACK`',
  'STOP before subscriptions',
  'do not issue a duplicate provider mutation',
  'prior known-good deploy identifier',
  'Never roll back database tenant isolation',
  'cross-tenant read/write visibility',
  'Never store passwords, service-role keys, NMI private keys'
]) if(!s.includes(phrase)) fail.push('rollback control missing: '+phrase);
for(const stage of ['Stage A','Stage B','Stage C','Stage D','Stage E']) if(!s.includes(stage)) fail.push('rollback stage missing: '+stage);
if(!s.includes('PRODUCTION_CUTOVER_SEQUENCE.md')) fail.push('rollback plan must bind to canonical cutover sequence');
if(fail.length){console.error(fail.map(x=>'FAIL '+x).join('\n'));process.exit(1)}
console.log('PASS production rollback plan gate — pre-cutover recovery point, stage stop rules, provider idempotency and app rollback boundaries locked');
