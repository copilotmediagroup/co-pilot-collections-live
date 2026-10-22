import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const sql=fs.readFileSync('MULTI_TENANT_PHASE58_PUBLIC_AGENCY_SIGNUP.sql','utf8');
const checks=[
 ['agency signup button exists',html.includes('Create Agency Account')],
 ['demo blocks agency signup',html.includes("Agency signup is disabled in the public demo")],
 ['signup creates auth user first',html.includes("requested_role:'agency_admin'")],
 ['signup calls constrained RPC',html.includes("/rpc/cpcm_request_agency_signup")],
 ['RPC requires authentication',sql.includes("if uid is null then raise exception 'Authentication required'")],
 ['RPC rejects existing membership',sql.includes('already belongs to an organization')],
 ['RPC starts pending payment',sql.includes("'pending_payment','standard',false")],
 ['first member is agency admin',sql.includes("values(oid,uid,'agency_admin',true)")],
 ['anon cannot invoke signup RPC',/revoke all on function public\.cpcm_request_agency_signup\(text,text,text,text\) from public,anon/.test(sql)]
];
let bad=false;for(const [n,ok] of checks){console.log((ok?'PASS ':'FAIL ')+n);if(!ok)bad=true}if(bad)process.exit(1);
