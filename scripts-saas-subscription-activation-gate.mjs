import fs from 'node:fs';
const sql=fs.readFileSync('MULTI_TENANT_PHASE68_SUBSCRIPTION_ACTIVATION.sql','utf8');
const edge=fs.readFileSync('supabase/functions/saas-subscription-checkout/index.ts','utf8');
const checks=[
 ['activation rpc exists',sql.includes('cpcm_service_activate_paid_subscription')],
 ['activation is service only',sql.includes("auth.role()) <> 'service_role'")&&sql.includes('grant execute on function public.cpcm_service_activate_paid_subscription')],
 ['requires provider reference',sql.includes('Provider reference required')],
 ['checkout must be submitted or paid',sql.includes("c.status not in ('submitted','paid')")],
 ['canonical checkout plan activates org',sql.includes("set plan=c.plan_code,status='active'")],
 ['demo cannot activate',sql.includes('coalesce(is_demo,false)=false')],
 ['subscription row becomes active',sql.includes("c.organization_id,c.plan_code,'active'")],
 ['billing interval comes from checkout',sql.includes('c.billing_interval')],
 ['edge calls activation after approval',edge.includes('cpcm_service_activate_paid_subscription')],
 ['edge returns active only after activation',edge.includes('subscriptionStatus:"active"')],
 ['browser cannot call activation',sql.includes('from public,anon,authenticated')]
];let bad=0;for(const [n,ok] of checks){console.log(ok?'PASS':'FAIL',n);if(!ok)bad++}process.exit(bad?1:0);
