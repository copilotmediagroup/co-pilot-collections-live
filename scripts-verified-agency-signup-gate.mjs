import fs from 'node:fs';const sql=fs.readFileSync('MULTI_TENANT_PHASE66_VERIFIED_AGENCY_SIGNUP_CONTINUATION.sql','utf8'),html=fs.readFileSync('index.html','utf8');const c=[
['verified continuation rpc exists',/cpcm_complete_verified_agency_signup\(\)/i.test(sql)],
['requires authenticated user',/Authentication required/i.test(sql)],
['only agency admin metadata can provision',/requested <> 'agency_admin'/i.test(sql)],
['existing membership is idempotent',/if oid is not null then return query/i.test(sql)],
['new org stays pending payment',/'pending_payment','standard',false/i.test(sql)],
['verified owner becomes agency admin',/'agency_admin',true/i.test(sql)],
['browser invokes verified continuation',html.includes('/rpc/cpcm_complete_verified_agency_signup')],
['pending owner opens pricing',html.includes('resumePendingAgencySubscription')]
];let bad=0;for(const [n,o] of c){console.log(o?'PASS':'FAIL',n);if(!o)bad++;}process.exit(bad?1:0);
