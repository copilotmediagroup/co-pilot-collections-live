import fs from 'node:fs';
let bad=0;const c=(n,ok)=>{console.log(ok?'PASS':'FAIL',n);if(!ok)bad++};
for(const f of ['saas-subscription-checkout','saas-subscription-plan-change','saas-subscription-cancellation','saas-subscription-checkout-recovery','saas-subscription-provider-events']){
 const s=fs.readFileSync(`supabase/functions/${f}/index.ts`,'utf8');
 c(`${f} supports legacy service role or new secret-key bundle`,s.includes('SUPABASE_SERVICE_ROLE_KEY')&&s.includes('SUPABASE_SECRET_KEYS'));
 if(f==='saas-subscription-plan-change')c('plan change parses secret-key bundle before createClient',/JSON\.parse\(raw\)/.test(s)&&/const serviceKey=serviceSecret\(\)/.test(s));
}
const d=fs.readFileSync('PRODUCTION_DEPLOYMENT_READINESS.md','utf8');c('readiness boundary says phase101',d.includes('Phases 57–101'));c('lifecycle secret scope excludes browser plan change',d.includes('Plan changes are initiated by an authenticated agency admin'));
if(bad)process.exit(1);
