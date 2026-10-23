import fs from 'node:fs';
const s=fs.readFileSync('supabase/functions/saas-subscription-checkout/index.ts','utf8');
const checks=[
 ['HTTP failure rejected',s.includes('if(!http)return false')],
 ['explicit success false rejected',s.includes('data?.success===false')],
 ['NMI response 2 and 3 rejected',s.includes('["2","3"].includes(response)')],
 ['non-100 response code rejected',s.includes('code&&code!=="100"')],
 ['error payload rejected',s.includes('data?.error_code||data?.error')],
 ['provider id fallback occurs only after failure guard',s.indexOf('if(explicitFailure)return false')<s.indexOf('return data?.success===true')],
 ['documented response 1 accepted',s.includes('response==="1"')],
 ['documented response code 100 accepted',s.includes('code==="100"')]
];
let bad=false;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad=true}if(bad)process.exit(1);
