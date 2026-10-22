import fs from 'node:fs';const sql=fs.readFileSync('MULTI_TENANT_PHASE67_ORGANIZATION_ACCESS_STATE.sql','utf8'),html=fs.readFileSync('index.html','utf8');const checks=[
['access-state rpc exists',sql.includes('cpcm_my_organization_access_state')],
['rpc is authenticated only',sql.includes('grant execute on function public.cpcm_my_organization_access_state() to authenticated')],
['membership uses auth uid',sql.includes('m.auth_user_id=(select auth.uid())')],
['rpc does not alter tenant resolver',!sql.includes('create or replace function private.current_organization_id')],
['frontend reads access state',html.includes('/rpc/cpcm_my_organization_access_state')],
['pending payment routes to pricing',html.includes("orgStatus==='pending_payment'||subStatus==='pending_payment'")&&html.includes('openSaasPricing()')],
['past due has specific copy',html.includes('subscription is past due')],
['suspended has specific copy',html.includes('agency is suspended')],
['cancelled has specific copy',html.includes('subscription is cancelled')]
];let bad=0;for(const [n,o] of checks){console.log(o?'PASS':'FAIL',n);if(!o)bad++}process.exit(bad?1:0);
