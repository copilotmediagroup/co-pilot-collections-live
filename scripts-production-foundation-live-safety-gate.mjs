import fs from 'node:fs';
const file='MULTI_TENANT_PRODUCTION_FOUNDATION_INSTALL_1_56_PRE_CUTOVER.sql';
const s=fs.readFileSync(file,'utf8');
const req=[1,2,3,4,5,6,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56];
for(const n of req){if(!new RegExp('MULTI_TENANT_PHASE'+n+'(?:_|\\.)').test(s)) throw new Error('missing phase '+n);}
if(/\\ir\s+MULTI_TENANT_PHASE7_/.test(s)) throw new Error('Phase 7 staging assertions must not execute in LIVE installer');
if(/\\ir\s+MULTI_TENANT_PHASE8_/.test(s)) throw new Error('Phase 8 cutover must remain held');
if(/MULTI_TENANT_DEMO_/.test(s)) throw new Error('DEMO SQL must not execute in LIVE installer');
if(!/Phase 7 is a STAGING\/DISPOSABLE JWT isolation procedure/.test(s)) throw new Error('Phase 7 hold rationale missing');
console.log('PASS production foundation LIVE-safety gate — Phase 7 staging assertions excluded, Phase 8 held, production phases represented');
